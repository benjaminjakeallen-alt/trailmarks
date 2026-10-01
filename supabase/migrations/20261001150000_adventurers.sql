-- Up to five AI-illustrated adventurers per person, kept so they can switch
-- between them. A row is reserved (file_name null) before the AI call and
-- removed if the call fails, so a failed try doesn't count against the five.
create table public.adventurers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text unique,
  created_at timestamptz not null default now()
);
create index adventurers_user_id_idx on public.adventurers (user_id);
alter table public.adventurers enable row level security;
-- Carry over illustrations made under the one-per-person rule.
insert into public.adventurers (user_id, file_name, created_at)
  select user_id, illustrated_file, coalesce(illustrated_at, now()) from public.profiles where illustrated_file is not null;
