-- Supabase SQL Editor で実行してください（Studio 音源 Storage）

insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;

create policy "Public read studio audio"
  on storage.objects for select
  using (bucket_id = 'audio');

create policy "Anon upload studio audio"
  on storage.objects for insert
  with check (bucket_id = 'audio');

create policy "Anon update studio audio"
  on storage.objects for update
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');

create policy "Anon delete studio audio"
  on storage.objects for delete
  using (bucket_id = 'audio');
