-- Adventurer avatars: each person's illustrated (or photo-badge) avatar,
-- made from a selfie. Stored in a private bucket and served by /a/<file>
-- to people in the same family.
alter table public.profiles add column avatar_file text;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false) on conflict (id) do nothing;
