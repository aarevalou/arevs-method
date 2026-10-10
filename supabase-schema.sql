create table if not exists public.app_data (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

alter table public.app_data enable row level security;

revoke all on table public.app_data from public, anon;
grant select, insert, update, delete on table public.app_data to authenticated;

drop policy if exists "Users can read their own app data" on public.app_data;
create policy "Users can read their own app data"
  on public.app_data for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own app data" on public.app_data;
create policy "Users can create their own app data"
  on public.app_data for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update their own app data" on public.app_data;
create policy "Users can update their own app data"
  on public.app_data for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own app data" on public.app_data;
create policy "Users can delete their own app data"
  on public.app_data for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.set_app_data_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_app_data_updated_at on public.app_data;
create trigger set_app_data_updated_at
  before update on public.app_data
  for each row
  execute function public.set_app_data_updated_at();
