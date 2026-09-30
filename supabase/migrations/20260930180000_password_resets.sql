-- Password reset links, issued by a family member (no email service needed).
-- Only a SHA-256 of the token is stored; the link itself is shown once to the
-- person who made it. Single use, and expires after 48 hours.
create table public.password_resets (
  id bigint generated always as identity primary key,
  token_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index password_resets_user_id_idx on public.password_resets (user_id);
create index password_resets_created_by_idx on public.password_resets (created_by);

alter table public.password_resets enable row level security;
