-- Neon Auth owns neon_auth.user; the browser receives only encrypted vault data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  full_name text not null,
  username text not null,
  username_lower text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_keys (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  kdf text not null default 'PBKDF2-SHA256',
  iterations integer not null,
  salt text not null,
  check_iv text not null,
  check_ct text not null,
  enc_version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  record_type text not null check (record_type in ('personal', 'login')),
  iv text not null,
  ciphertext text not null,
  enc_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_records_user_created_idx
  on public.vault_records(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.vault_keys enable row level security;
alter table public.vault_records enable row level security;

create policy profiles_own_select on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_own_insert on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_own_update on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy vault_keys_own_select on public.vault_keys
  for select to authenticated using (user_id = (select auth.uid()));
create policy vault_keys_own_insert on public.vault_keys
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy vault_records_own_select on public.vault_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy vault_records_own_insert on public.vault_records
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy vault_records_own_update on public.vault_records
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy vault_records_own_delete on public.vault_records
  for delete to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.vault_keys to authenticated;
grant select, insert, update, delete on public.vault_records to authenticated;
revoke all on public.profiles, public.vault_keys, public.vault_records from anonymous;
