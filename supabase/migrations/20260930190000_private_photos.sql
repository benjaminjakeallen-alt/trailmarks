-- Photos are served by the app's own /p/<file> route, which checks the
-- viewer is in the photo's family. Look photos up by file name, and stop
-- the bucket from serving anything publicly.
create unique index if not exists photos_file_name_key on public.photos (file_name);
update storage.buckets set public = false where id = 'photos';
