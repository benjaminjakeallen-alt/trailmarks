-- Family accounts.
--
-- Everyone signs in with their own Supabase Auth user and belongs to one
-- family. State claims are per person (one row per person per state); trips,
-- memories and photos are shared with the family and record who made them.
--
-- RLS stays "on, no policies" on every table: the app reads and writes only
-- through its own server routes with the service role, which scope every
-- query by the signed-in person's family.

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  color text not null,
  created_at timestamptz not null default now()
);
create index profiles_family_id_idx on public.profiles (family_id);

alter table public.families enable row level security;
alter table public.profiles enable row level security;

-- state_visits: from one row per state to one row per person per state.
-- Unclaimed leftovers from the single-user version carry no information.
delete from public.state_visits where visited = false;
alter table public.state_visits drop constraint state_visits_pkey;
alter table public.state_visits add column id bigint generated always as identity primary key;
alter table public.state_visits add column user_id uuid references auth.users (id) on delete cascade;
alter table public.state_visits add column family_id uuid references public.families (id) on delete cascade;
create unique index state_visits_user_state_key on public.state_visits (user_id, state_code);
create index state_visits_family_id_idx on public.state_visits (family_id);

-- Shared content remembers its author and belongs to a family.
alter table public.trips
  add column user_id uuid references auth.users (id) on delete set null,
  add column family_id uuid references public.families (id) on delete cascade;
create index trips_family_id_idx on public.trips (family_id);

alter table public.memories
  add column user_id uuid references auth.users (id) on delete set null,
  add column family_id uuid references public.families (id) on delete cascade;
create index memories_family_id_idx on public.memories (family_id);
create index memories_trip_id_idx on public.memories (trip_id);

alter table public.photos
  add column user_id uuid references auth.users (id) on delete set null,
  add column family_id uuid references public.families (id) on delete cascade;
create index photos_family_id_idx on public.photos (family_id);
create index photos_memory_id_idx on public.photos (memory_id);
