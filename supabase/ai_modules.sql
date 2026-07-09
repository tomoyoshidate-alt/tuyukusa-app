-- AI module catalog (Layer 2) + user selection on profiles
-- Run in Supabase SQL Editor for project "Tsuyukusa AD"

create table if not exists public.ai_modules (
  id text primary key,
  name text not null,
  display_name text not null,
  emoji text not null default '',
  tagline text not null default '',
  persona jsonb not null default '{}'::jsonb,
  system_prompt text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_modules enable row level security;

create policy "ai_modules_read_active"
  on public.ai_modules for select
  to authenticated, anon
  using (is_active = true);

-- Seed the three Date AI modules (idempotent)
insert into public.ai_modules (id, name, display_name, emoji, tagline, persona, system_prompt, sort_order, is_active)
values
  (
    'date-general-v1',
    '伊達AI（汎用養生）',
    '🌿 毎日の養生',
    '🌿',
    '起床・食事・入浴・睡眠リズムの助言',
    '{"display_name":"ともせんせい","tone":"穏やか・簡潔・押し付けない"}'::jsonb,
    '（アプリ内 modules.ts の GENERAL_SYSTEM_PROMPT を参照 — 実行時はコード側を正とする）',
    1,
    true
  ),
  (
    'date-adhd-v1',
    '伊達AI（ADHD）',
    '📝 暮らしの整理',
    '📝',
    '持ち物確認・タスク整理・休息とバッファ時間',
    '{"display_name":"ともせんせい","tone":"穏やか・簡潔・押し付けない"}'::jsonb,
    '（アプリ内 modules.ts の ADHD_SYSTEM_PROMPT を参照 — 実行時はコード側を正とする）',
    2,
    true
  ),
  (
    'date-kafun-v1',
    '伊達AI（花粉症）',
    '🌸 花粉の季節に',
    '🌸',
    '花粉予報×体質の助言・外出前ケア',
    '{"display_name":"ともせんせい","tone":"穏やか・簡潔・押し付けない"}'::jsonb,
    '（アプリ内 modules.ts の KAFUN_SYSTEM_PROMPT を参照 — 実行時はコード側を正とする）',
    3,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  display_name = excluded.display_name,
  emoji = excluded.emoji,
  tagline = excluded.tagline,
  persona = excluded.persona,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- User selection: switching module does NOT reset chat history or learned traits
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles
      add column if not exists selected_ai_module_id text
      references public.ai_modules(id)
      default 'date-general-v1';

    comment on column public.profiles.selected_ai_module_id is
      'Active AI module (Layer 2). Chat logs and traits are preserved when changed.';
  end if;
end $$;
