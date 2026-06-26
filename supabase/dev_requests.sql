-- Supabase SQL Editor で実行してください（開発依頼システム）
-- 適用後: Storage バケット「attachments」が public 読み取り可能になります。

-- ── Storage: 依頼添付用バケット ──
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

create policy "Public read attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Anon upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments');

-- ── dev_requests ──
create table if not exists dev_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  requester_name text,
  title text,
  body text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  attachments jsonb not null default '[]'::jsonb,
  page_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dev_requests_status_idx on dev_requests (status);
create index if not exists dev_requests_requester_idx on dev_requests (requester_id);
create index if not exists dev_requests_created_at_idx on dev_requests (created_at desc);

-- ── dev_request_updates ──
create table if not exists dev_request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references dev_requests (id) on delete cascade,
  kind text not null check (kind in ('reply', 'status_change')),
  body text,
  new_status text,
  created_at timestamptz not null default now()
);

create index if not exists dev_request_updates_request_idx on dev_request_updates (request_id, created_at);

-- ── dev_notifications ──
create table if not exists dev_notifications (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  request_id uuid not null references dev_requests (id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dev_notifications_requester_unread_idx
  on dev_notifications (requester_id, read, created_at desc);

-- ── updated_at 自動更新 ──
create or replace function dev_requests_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dev_requests_updated_at on dev_requests;
create trigger dev_requests_updated_at
  before update on dev_requests
  for each row execute function dev_requests_set_updated_at();

-- ── RLS（公開前は緩め。本番では requester_id 本人 + 開発者ロールに絞ること） ──
alter table dev_requests enable row level security;
alter table dev_request_updates enable row level security;
alter table dev_notifications enable row level security;

create policy "dev_requests anon all"
  on dev_requests for all
  using (true)
  with check (true);

create policy "dev_request_updates anon all"
  on dev_request_updates for all
  using (true)
  with check (true);

create policy "dev_notifications anon all"
  on dev_notifications for all
  using (true)
  with check (true);
