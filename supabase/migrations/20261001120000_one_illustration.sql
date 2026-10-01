-- One AI-illustrated adventurer per person (each costs AI Gateway credits).
-- illustrated_at marks the one try as used; illustrated_file keeps the result
-- (in the avatars bucket) so it's never lost and can be switched back to.
-- To give someone another try: update profiles set illustrated_at = null, illustrated_file = null where ...
alter table public.profiles add column illustrated_at timestamptz, add column illustrated_file text;
