-- Each person's 3D character for the lifted-state scenes: body, hat, skin, hair
-- and outfit colors (see src/lib/look.ts). Null means "use the default look".
alter table public.profiles add column if not exists character jsonb;
