-- My Personal Vault: base schema.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  username text not null,
  username_lower text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_identities (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username_lower text not null unique,
  login_method text not null check (login_method in ('email_password', 'username_password', 'username_pin')),
  pin_salt text,
  pin_hash text,
  pin_iterations integer,
  pin_failed_count integer not null default 0,
  pin_locked_until timestamptz,
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
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
  user_id uuid not null references auth.users (id) on delete cascade,
  record_type text not null check (record_type in ('personal', 'login')),
  iv text not null,
  ciphertext text not null,
  enc_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_records_user_created_idx
  on public.vault_records (user_id, created_at desc);

create table if not exists public.pin_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('signup_verify', 'signin', 'pin_reset')),
  code_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pin_challenges_user_idx
  on public.pin_challenges (user_id, purpose, created_at desc);

create table if not exists public.pin_reset_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);