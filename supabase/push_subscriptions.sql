-- push_subscriptions : Web Push（VAPID）購読情報
-- Tsuyukusa AD / Layer C
--
-- 注意: 本アプリは現状 Supabase Auth 未実装のため、user_id ではなく
-- クライアント生成の client_id（tuyukusa_sync の sync_id 等）で識別する。
-- tuyukusa_sync 同様「anon all」の暫定 RLS。★本番硬化時に auth 化すること。

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_client_id_idx
  on public.push_subscriptions (client_id);

alter table public.push_subscriptions enable row level security;

-- 暫定: anon による全操作許可（tuyukusa_sync と同方針。要本番硬化）
drop policy if exists push_subscriptions_anon_all on public.push_subscriptions;
create policy push_subscriptions_anon_all on public.push_subscriptions
  for all using (true) with check (true);
