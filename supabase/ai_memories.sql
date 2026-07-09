-- ai_memories: AI-learned facts about the user (persist across module switches)
-- Run in Supabase SQL Editor for project "Tsuyukusa AD"

create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  category text not null check (
    category in ('constitution', 'lifestyle', 'preference', 'symptom_pattern', 'family')
  ),
  confidence real not null check (confidence >= 0 and confidence <= 1),
  source_module_id text references public.ai_modules(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_memories_user_id_updated_at_idx
  on public.ai_memories (user_id, updated_at desc);

create index if not exists ai_memories_user_category_idx
  on public.ai_memories (user_id, category);

alter table public.ai_memories enable row level security;

create policy "ai_memories_select_own"
  on public.ai_memories for select
  to authenticated
  using (auth.uid() = user_id);

create policy "ai_memories_insert_own"
  on public.ai_memories for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "ai_memories_update_own"
  on public.ai_memories for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ai_memories_delete_own"
  on public.ai_memories for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.ai_memories is
  'User facts learned from chat. Persists when AI module (Layer 2) is switched.';
