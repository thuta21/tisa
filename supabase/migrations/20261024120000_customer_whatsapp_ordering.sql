-- Customer contact edits use a narrow RPC; customers cannot update profile roles.
alter table public.profiles add column if not exists phone text;

create or replace function public.update_customer_profile(p_display_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_display_name, ''))) not between 2 and 100
     or p_display_name ~ E'[\r\n]'
     or trim(coalesce(p_phone, '')) !~ '^\+?[0-9 ()-]{7,25}$'
     or length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 7 then
    raise exception 'Enter a valid name and phone number.' using errcode = '22023';
  end if;
  insert into public.profiles(id, display_name, phone)
    values(auth.uid(), trim(p_display_name), trim(p_phone))
    on conflict(id) do update set display_name = excluded.display_name, phone = excluded.phone;
end;
$$;
revoke all on function public.update_customer_profile(text, text) from public, anon;
grant execute on function public.update_customer_profile(text, text) to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, phone)
  values(new.id,
    left(nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', '')), ''), 100),
    left(nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''), 25))
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_profile_for_new_user() from public;

create table public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(trim(label)) between 1 and 80),
  phone text not null unique check(phone ~ '^[1-9][0-9]{6,14}$'),
  is_available boolean not null default false,
  sort_order integer not null default 0 check(sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger whatsapp_contacts_set_updated_at before update on public.whatsapp_contacts
for each row execute function public.set_updated_at();
alter table public.whatsapp_contacts enable row level security;
grant select, insert, update, delete on public.whatsapp_contacts to authenticated;
create policy "Admins manage WhatsApp contacts" on public.whatsapp_contacts
for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy "Customers can route to available WhatsApp contacts" on public.whatsapp_contacts
for select to authenticated using(is_available);
create index whatsapp_contacts_available_order_idx on public.whatsapp_contacts(sort_order, created_at) where is_available;
