-- Row Level Security: every row is scoped to the signed-in user.

alter table public.profiles enable row level security;
alter table public.vault_identities enable row level security;
alter table public.vault_keys enable row level security;
alter table public.vault_records enable row level security;
alter table public.pin_challenges enable row level security;
alter table public.pin_reset_tokens enable row level security;
alter table public.rate_limits enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- vault_identities (read-only for the client)
drop policy if exists identities_select_own on public.vault_identities;
create policy identities_select_own on public.vault_identities
  for select using (auth.uid() = user_id);

-- vault_keys
drop policy if exists vault_keys_select_own on public.vault_keys;
create policy vault_keys_select_own on public.vault_keys
  for select using (auth.uid() = user_id);

drop policy if exists vault_keys_insert_own on public.vault_keys;
create policy vault_keys_insert_own on public.vault_keys
  for insert with check (auth.uid() = user_id);

drop policy if exists vault_keys_update_own on public.vault_keys;
create policy vault_keys_update_own on public.vault_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- vault_records
drop policy if exists records_select_own on public.vault_records;
create policy records_select_own on public.vault_records
  for select using (auth.uid() = user_id);

drop policy if exists records_insert_own on public.vault_records;
create policy records_insert_own on public.vault_records
  for insert with check (auth.uid() = user_id);

drop policy if exists records_update_own on public.vault_records;
create policy records_update_own on public.vault_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists records_delete_own on public.vault_records;
create policy records_delete_own on public.vault_records
  for delete using (auth.uid() = user_id);

-- pin_challenges (read-only for the client)
drop policy if exists challenges_select_own on public.pin_challenges;
create policy challenges_select_own on public.pin_challenges
  for select using (auth.uid() = user_id);

-- pin_reset_tokens (read-only for the client)
drop policy if exists reset_tokens_select_own on public.pin_reset_tokens;
create policy reset_tokens_select_own on public.pin_reset_tokens
  for select using (auth.uid() = user_id);

-- The service role bypasses RLS entirely, which is how the worker writes
-- challenges, identities and rate-limit buckets.