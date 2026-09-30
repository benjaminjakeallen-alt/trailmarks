-- Voice journals keep their recording: one audio clip per memory, in a
-- private bucket served by /v/<file> to the memory's family.
alter table public.memories add column audio_file text, add column audio_seconds real;
create unique index if not exists memories_audio_file_key on public.memories (audio_file);
insert into storage.buckets (id, name, public) values ('voice', 'voice', false) on conflict (id) do nothing;
