create extension if not exists vector with schema extensions;
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  content text not null,
  content_hash text not null,
  status text not null default 'pending' check(status in ('pending','indexing','ready','failed')),
  updated_at timestamptz not null default now()
);
create table public.knowledge_chunks (
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  content_hash text not null,
  model text not null default 'gte-small',
  model_version text not null default '1',
  embedding extensions.vector(384) not null,
  primary key(document_id,chunk_index)
);
create index knowledge_embedding_hnsw on public.knowledge_chunks using hnsw(embedding extensions.vector_cosine_ops);
create table public.knowledge_jobs (
  document_id uuid primary key references public.knowledge_documents(id) on delete cascade,
  content_hash text not null,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  last_error text
);
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_jobs enable row level security;
create policy "Admins read indexing state" on public.knowledge_documents for select to authenticated using(private.is_admin());
create policy "Admins read indexing jobs" on public.knowledge_jobs for select to authenticated using(private.is_admin());
grant select on public.knowledge_documents,public.knowledge_jobs to authenticated;
grant all on public.knowledge_documents,public.knowledge_chunks,public.knowledge_jobs to service_role;

create function private.queue_product_knowledge(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare body text;hash text;doc uuid;
begin
  select concat_ws(E'\n',name,team,category,season,sleeve,fabric,description,
    (select string_agg(concat_ws(' ',v.name,v.kit,v.sku),' ') from public.product_variants v where v.product_id=p.id),
    (select string_agg(a.source_name,' ') from public.inventory_aliases a join public.product_variants v on v.id=a.variant_id where v.product_id=p.id))
  into body from public.products p where id=p_id;
  if not found then return;end if;
  hash:=md5(body);
  insert into public.knowledge_documents(product_id,content,content_hash) values(p_id,body,hash)
  on conflict(product_id) do update set content=excluded.content,content_hash=excluded.content_hash,status='pending',updated_at=now()
  where knowledge_documents.content_hash<>excluded.content_hash returning id into doc;
  if doc is null then return;end if;
  insert into public.knowledge_jobs(document_id,content_hash) values(doc,hash)
  on conflict(document_id) do update set content_hash=excluded.content_hash,attempts=0,available_at=now(),lease_id=null,lease_until=null,last_error=null;
end $$;
create function private.catalog_knowledge_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
  if tg_table_name='products' then pid:=new.id;
  elsif tg_table_name='inventory_aliases' then select product_id into pid from public.product_variants where id=coalesce(new.variant_id,old.variant_id);
  else if tg_op='DELETE' then pid:=old.product_id;else pid:=new.product_id;end if;
  end if;
  perform private.queue_product_knowledge(pid);
  return null;
end $$;
create trigger queue_product_knowledge after insert or update of name,team,category,season,sleeve,fabric,description,status on public.products for each row execute function private.catalog_knowledge_changed();
create trigger queue_variant_knowledge after insert or update or delete on public.product_variants for each row execute function private.catalog_knowledge_changed();
create trigger queue_alias_knowledge after insert or update or delete on public.inventory_aliases for each row execute function private.catalog_knowledge_changed();

create function public.reindex_catalog() returns void language plpgsql security definer set search_path='' as $$
declare p record;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
  for p in select id from public.products loop perform private.queue_product_knowledge(p.id);end loop;
  insert into public.knowledge_jobs(document_id,content_hash) select id,content_hash from public.knowledge_documents
  on conflict(document_id) do update set attempts=0,available_at=now(),lease_id=null,lease_until=null;
  update public.knowledge_documents set status='pending';
end $$;
revoke all on function public.reindex_catalog() from public;
grant execute on function public.reindex_catalog() to authenticated;

create function public.claim_knowledge_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare jobs jsonb;
begin
  with picked as (select document_id from public.knowledge_jobs where attempts<5 and available_at<=now() and (lease_until is null or lease_until<now()) order by available_at limit 5 for update skip locked),
  leased as (update public.knowledge_jobs j set lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1 from picked where j.document_id=picked.document_id returning j.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',l.document_id,'hash',l.content_hash,'lease',l.lease_id,'content',d.content)),'[]') into jobs from leased l join public.knowledge_documents d on d.id=l.document_id;
  update public.knowledge_documents set status='indexing' where id in(select (value->>'id')::uuid from jsonb_array_elements(jobs));
  return jobs;
end $$;
create function public.finish_knowledge_job(p_id uuid,p_hash text,p_lease uuid,p_chunks jsonb,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.knowledge_jobs%rowtype;chunk jsonb;
begin
  select * into j from public.knowledge_jobs where document_id=p_id for update;
  if not found or j.content_hash<>p_hash or j.lease_id is distinct from p_lease then return false;end if;
  if p_error is not null then
    update public.knowledge_jobs set last_error=left(p_error,500),lease_id=null,lease_until=null,available_at=now()+make_interval(secs=>least(3600,30*(2^attempts)::integer)) where document_id=p_id;
    update public.knowledge_documents set status=case when j.attempts>=5 then 'failed' else 'pending' end where id=p_id;
    return false;
  end if;
  if jsonb_array_length(p_chunks)=0 then raise exception 'No embedding chunks';end if;
  delete from public.knowledge_chunks where document_id=p_id;
  for chunk in select value from jsonb_array_elements(p_chunks) loop
    insert into public.knowledge_chunks(document_id,chunk_index,content,content_hash,embedding)
    values(p_id,(chunk->>'index')::integer,chunk->>'content',p_hash,(chunk->>'embedding')::extensions.vector);
  end loop;
  update public.knowledge_documents set status='ready' where id=p_id and content_hash=p_hash;
  delete from public.knowledge_jobs where document_id=p_id;
  return true;
end $$;
revoke all on function public.claim_knowledge_jobs(),public.finish_knowledge_job(uuid,text,uuid,jsonb,text) from public;
grant execute on function public.claim_knowledge_jobs(),public.finish_knowledge_job(uuid,text,uuid,jsonb,text) to service_role;

create function public.search_catalog_knowledge(p_query text,p_embedding extensions.vector(384) default null,p_team text default null) returns jsonb language sql stable security definer set search_path='' as $$
  with scored as (
    select p.id,p.slug,p.name,d.content,
      (case when lower(p.name)=lower(p_query) or exists(select 1 from public.product_variants v left join public.inventory_aliases a on a.variant_id=v.id where v.product_id=p.id and (lower(v.sku)=lower(p_query) or a.source_name=lower(p_query))) then 10 else 0 end
       +case when position(lower(p_query) in lower(concat_ws(' ',p.name,p.team,d.content)))>0 then 2 else 0 end
       +coalesce((select max(1-(c.embedding operator(extensions.<=>) p_embedding)) from public.knowledge_chunks c where c.document_id=d.id and c.content_hash=d.content_hash and p_embedding is not null),0)) as score
    from public.products p left join public.knowledge_documents d on d.product_id=p.id
    where p.status='active' and (p_team is null or lower(p.team)=lower(p_team)) and length(btrim(p_query)) between 1 and 500
  ), top_results as(select * from scored where score>0.35 order by score desc,id limit 10)
  select coalesce(jsonb_agg(jsonb_build_object('productId',t.id,'name',t.name,'source','/jersey/'||t.slug,'text',t.content,'score',t.score,
    'variants',(select coalesce(jsonb_agg(jsonb_build_object('variantId',v.id,'name',v.name,'sku',v.sku,'price',v.price,'sizes',(select coalesce(jsonb_agg(jsonb_build_object('size',i.size,'available',greatest(0,i.quantity-i.reserved))),'[]') from public.inventory i where i.variant_id=v.id and i.is_active))),'[]') from public.product_variants v where v.product_id=t.id and v.available))), '[]') from top_results t;
$$;
revoke all on function public.search_catalog_knowledge(text,extensions.vector,text) from public;
grant execute on function public.search_catalog_knowledge(text,extensions.vector,text) to anon,authenticated,service_role;
-- Seed only catalog text. No order/customer/payment data enters the index.
do $$ declare p record;begin for p in select id from public.products loop perform private.queue_product_knowledge(p.id);end loop;end $$;
