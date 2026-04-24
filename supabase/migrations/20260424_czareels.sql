-- Create czareels table
create table if not exists czareels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text,
  caption text check (char_length(caption) <= 150),
  charisma_tag text,
  charisma_emoji text,
  mood_emojis text[] default '{}',
  duration_sec float,
  views int default 0,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists czareels_user_id_idx on czareels(user_id);
create index if not exists czareels_created_at_idx on czareels(created_at desc);

-- RLS
alter table czareels enable row level security;

-- Public read
create policy "czareels_public_read" on czareels
  for select using (true);

-- Authenticated insert (own rows only)
create policy "czareels_owner_insert" on czareels
  for insert with check (auth.uid() = user_id);

-- Owner update/delete
create policy "czareels_owner_update" on czareels
  for update using (auth.uid() = user_id);

create policy "czareels_owner_delete" on czareels
  for delete using (auth.uid() = user_id);

-- Storage bucket (run in Supabase dashboard if CLI not available)
-- insert into storage.buckets (id, name, public) values ('czareels-videos', 'czareels-videos', true)
-- on conflict (id) do nothing;

-- Storage RLS
-- create policy "czareels_videos_public_read" on storage.objects for select using (bucket_id = 'czareels-videos');
-- create policy "czareels_videos_auth_insert" on storage.objects for insert with check (bucket_id = 'czareels-videos' and auth.role() = 'authenticated');
-- create policy "czareels_videos_owner_delete" on storage.objects for delete using (bucket_id = 'czareels-videos' and auth.uid()::text = (storage.foldername(name))[1]);
