-- Keep what the camera knew. EXIF is read in the browser before upload
-- (the server re-encodes to WebP, which strips it), then stored here so
-- photos can be sorted into trips and steps by time and place.
alter table public.photos
  add column taken_at timestamptz,
  add column lat double precision,
  add column lng double precision;
create index photos_taken_at_idx on public.photos (taken_at);
