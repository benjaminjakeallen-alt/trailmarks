-- The world map: one row per person per country (ISO 3166 alpha-2), same
-- shape as state_visits. The United States counts as visited for anyone
-- who has claimed a state, so it isn't stored here.
create table public.country_visits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  first_visited_on date,
  created_at timestamptz not null default now()
);
create unique index country_visits_user_country_key on public.country_visits (user_id, country_code);
create index country_visits_family_id_idx on public.country_visits (family_id);
alter table public.country_visits enable row level security;
