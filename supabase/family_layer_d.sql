-- family_layer_d : 家族アカウント（Layer D つながり層）
-- Tsuyukusa AD
--
-- ★前提: このマイグレーションは Supabase Auth（auth.users）が有効であることを
--   前提とする。現状アプリは Auth 未実装のため、Auth 導入後に適用すること。
--   （architecture.md「8. 実装状況マップ」参照）
--
-- 中核思想: 「家族は1つの体」。会話(ai_conversations/ai_messages)と個人メモ
--   (ai_memories)は既定で非共有。共有は本人が明示的に許可した範囲のみ。

-- 家族グループ
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 家族メンバー（ユーザー×家族＋ロール＋共有設定）
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','adult','guardian','dependent')),
  share_briefing boolean not null default true,
  share_vitals   boolean not null default true,
  share_memories boolean not null default false,
  share_chat     boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- 招待
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text,
  token text not null unique,
  role text not null default 'adult' check (role in ('adult','guardian','dependent')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- 血圧など見守り記録（既存に記録テーブルがあれば統合すること）
create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  systolic int,
  diastolic int,
  pulse int,
  note text,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists family_members_family_id_idx on public.family_members(family_id);
create index if not exists vitals_user_measured_idx on public.vitals(user_id, measured_at desc);

-- ヘルパー: 指定ユーザーが指定家族のメンバーか
create or replace function public.is_family_member(fid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members m where m.family_id = fid and m.user_id = uid);
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.vitals enable row level security;

-- families: メンバーのみ閲覧、ownerのみ書込
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select using (public.is_family_member(id, auth.uid()));
drop policy if exists families_owner_write on public.families;
create policy families_owner_write on public.families
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- family_members: 同一家族のメンバーは相互閲覧、本人は自分の行を更新
drop policy if exists fm_select on public.family_members;
create policy fm_select on public.family_members
  for select using (public.is_family_member(family_id, auth.uid()));
drop policy if exists fm_self_update on public.family_members;
create policy fm_self_update on public.family_members
  for update using (user_id = auth.uid());

-- vitals: 本人は常に可、家族は本人が share_vitals=true かつ同一家族なら閲覧
drop policy if exists vitals_self on public.vitals;
create policy vitals_self on public.vitals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists vitals_family_read on public.vitals;
create policy vitals_family_read on public.vitals
  for select using (
    exists (
      select 1 from family_members me, family_members target
      where me.user_id = auth.uid()
        and target.user_id = vitals.user_id
        and me.family_id = target.family_id
        and target.share_vitals = true
    )
  );
