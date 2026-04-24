-- Add social columns to czareels
alter table czareels add column if not exists likes int default 0;
alter table czareels add column if not exists comments int default 0;

-- Likes junction table (one row per user-like, prevents duplicates)
create table if not exists czareel_likes (
  czareel_id uuid references czareels(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (czareel_id, user_id)
);

alter table czareel_likes enable row level security;

create policy "czareel_likes_public_read" on czareel_likes
  for select using (true);

create policy "czareel_likes_auth_insert" on czareel_likes
  for insert with check (auth.uid() = user_id);

create policy "czareel_likes_owner_delete" on czareel_likes
  for delete using (auth.uid() = user_id);

-- Function to keep czareels.likes in sync
create or replace function sync_czareel_likes_count()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update czareels set likes = likes + 1 where id = new.czareel_id;
  elsif (tg_op = 'DELETE') then
    update czareels set likes = greatest(likes - 1, 0) where id = old.czareel_id;
  end if;
  return null;
end;
$$;

create trigger on_czareel_like_change
  after insert or delete on czareel_likes
  for each row execute procedure sync_czareel_likes_count();
