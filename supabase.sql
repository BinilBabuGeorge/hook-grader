-- Run in Supabase SQL editor.
create table if not exists hook_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  designation text,
  email text not null,
  hook text not null,
  score int not null,
  rules jsonb,
  rewrites jsonb,
  ai_error text
);
alter table hook_sessions enable row level security; -- server uses service key; no public access
