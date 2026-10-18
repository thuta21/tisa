-- Private, export-only marketing workspace. No commerce permissions are changed.
create table public.marketing_drafts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  snapshot jsonb not null,
  selected_images jsonb not null check(jsonb_typeof(selected_images)='array' and jsonb_array_length(selected_images) between 1 and 4),
  tone text not null default 'showcase' check(tone in ('showcase','fan','comparison')),
  caption text not null check(length(caption) between 1 and 5000),
  revision integer not null default 1 check(revision > 0),
  status text not null default 'draft' check(status in ('draft','ready','exported')),
  archived boolean not null default false,
  created_by uuid default auth.uid(), updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.marketing_drafts(id) on delete cascade,
  revision integer not null, kind text not null check(kind in ('source','poster','video')),
  path text not null unique, mime text not null, bytes integer not null check(bytes>0), source_id text,
  created_at timestamptz not null default now(),
  check((kind='source')=(source_id is not null))
);
create unique index marketing_asset_source on public.marketing_assets(draft_id,revision,source_id) where kind='source';
create table public.marketing_jobs (
  id uuid primary key default gen_random_uuid(), draft_id uuid not null references public.marketing_drafts(id) on delete cascade,
  revision integer not null, kind text not null check(kind in ('ai','poster','video')),
  state text not null default 'running' check(state in ('running','succeeded','failed')),
  actor_id uuid not null default auth.uid(), result jsonb, error text,
  input_tokens integer not null default 0, output_tokens integer not null default 0,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes', finished_at timestamptz
);
create unique index marketing_one_running_job on public.marketing_jobs(draft_id) where state='running';
create index marketing_drafts_updated on public.marketing_drafts(updated_at desc);
create index marketing_jobs_actor_usage on public.marketing_jobs(actor_id,created_at) where kind='ai';
create or replace function private.marketing_revision() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.updated_at=now(); new.updated_by=auth.uid();
  if (new.snapshot,new.selected_images,new.tone,new.caption) is distinct from (old.snapshot,old.selected_images,old.tone,old.caption) then
    new.revision=old.revision+1; new.status='draft';
  else new.revision=old.revision; end if;
  return new;
end;$$;
create trigger marketing_revision before update on public.marketing_drafts for each row execute function private.marketing_revision();

-- A database lease coordinates concurrent Vercel instances and atomically reserves AI quota.
create or replace function public.start_marketing_job(p_draft uuid,p_revision integer,p_kind text,p_ai_limit integer default 20) returns public.marketing_jobs
language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.marketing_drafts; j public.marketing_jobs;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  if p_kind not in ('ai','poster','video') then raise exception 'Invalid job kind'; end if;
  if p_kind='ai' then
    perform pg_advisory_xact_lock(hashtext('marketing-ai:'||auth.uid()::text));
    if (select count(*) from marketing_jobs where actor_id=auth.uid() and kind='ai' and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=greatest(1,least(p_ai_limit,100)) then
      raise exception 'Daily AI generation limit reached';
    end if;
  end if;
  select * into d from marketing_drafts where id=p_draft for update;
  if not found or d.archived then raise exception 'Draft not available'; end if;
  if d.revision<>p_revision then raise exception 'Draft changed. Reload before continuing.' using errcode='40001'; end if;
  if not exists(select 1 from products where id=d.product_id and status='active') then raise exception 'Product is no longer active. Select another product.'; end if;
  if p_kind<>'ai' and d.status not in ('ready','exported') then raise exception 'Review and mark the draft ready before exporting.'; end if;
  update marketing_jobs set state='failed',error='Render attempt expired. Retry is available.',finished_at=now() where draft_id=p_draft and state='running' and expires_at<=now();
  if exists(select 1 from marketing_jobs where draft_id=p_draft and state='running') then raise exception 'Another operation is running for this draft.' using errcode='40001'; end if;
  insert into marketing_jobs(draft_id,revision,kind) values(p_draft,p_revision,p_kind) returning * into j;
  return j;
end;$$;
revoke all on function public.start_marketing_job(uuid,integer,text,integer) from public,anon;
grant execute on function public.start_marketing_job(uuid,integer,text,integer) to authenticated;

alter table public.marketing_drafts enable row level security;
alter table public.marketing_assets enable row level security;
alter table public.marketing_jobs enable row level security;
create policy "Admins manage marketing drafts" on public.marketing_drafts for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "Admins manage marketing assets" on public.marketing_assets for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "Admins inspect marketing jobs" on public.marketing_jobs for select to authenticated using(private.is_admin());
create policy "Admins finish their marketing jobs" on public.marketing_jobs for update to authenticated using(private.is_admin() and actor_id=auth.uid()) with check(private.is_admin() and actor_id=auth.uid());
grant select,insert,update,delete on public.marketing_drafts,public.marketing_assets to authenticated;
grant select,update on public.marketing_jobs to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketing-assets','marketing-assets',false,52428800,array['image/png','image/jpeg','video/mp4']) on conflict(id) do nothing;
create policy "Admins read marketing media" on storage.objects for select to authenticated using(bucket_id='marketing-assets' and private.is_admin());
create policy "Admins create marketing media" on storage.objects for insert to authenticated with check(bucket_id='marketing-assets' and private.is_admin());
create policy "Admins delete marketing media" on storage.objects for delete to authenticated using(bucket_id='marketing-assets' and private.is_admin());
create or replace function public.finish_marketing_job(p_job uuid,p_asset jsonb default null,p_result jsonb default null,p_error text default null,p_input_tokens integer default 0,p_output_tokens integer default 0) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.marketing_jobs; d public.marketing_drafts; asset_id uuid;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  -- Always lock draft before job, in the same order as start_marketing_job.
  select * into j from marketing_jobs where id=p_job;
  if not found then raise exception 'Job not found'; end if;
  select * into d from marketing_drafts where id=j.draft_id for update;
  select * into j from marketing_jobs where id=p_job for update;
  if j.actor_id<>auth.uid() or j.state<>'running' then raise exception 'Job is no longer running'; end if;
  if p_error is not null or j.expires_at<=now() or d.revision<>j.revision or d.archived then
    update marketing_jobs set state='failed',error=coalesce(left(p_error,500),'Draft changed or operation expired. Retry the current revision.'),finished_at=now() where id=j.id;
    return null;
  end if;
  if j.kind<>'ai' then
    if not exists(select 1 from products where id=d.product_id and status='active') then
      update marketing_jobs set state='failed',error='Product is no longer active.',finished_at=now() where id=j.id;return null;
    end if;
    if p_asset is null or p_asset->>'path' not like d.id::text||'/exports/'||j.id::text||'%' then raise exception 'Invalid export asset';end if;
    insert into marketing_assets(draft_id,revision,kind,path,mime,bytes)
      values(d.id,d.revision,j.kind,p_asset->>'path',p_asset->>'mime',(p_asset->>'bytes')::integer) returning id into asset_id;
    update marketing_drafts set status='exported' where id=d.id;
  end if;
  update marketing_jobs set state='succeeded',result=case when asset_id is null then p_result else jsonb_build_object('assetId',asset_id) end,
    input_tokens=greatest(0,p_input_tokens),output_tokens=greatest(0,p_output_tokens),finished_at=now() where id=j.id;
  return j.id;
end;$$;
revoke all on function public.finish_marketing_job(uuid,jsonb,jsonb,text,integer,integer) from public,anon;
grant execute on function public.finish_marketing_job(uuid,jsonb,jsonb,text,integer,integer) to authenticated;
