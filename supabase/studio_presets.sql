-- Supabase SQL Editor で実行してください（Studio プリセットのクラウド同期）

create table if not exists bb_presets (
  id uuid primary key,
  name text not null,
  icon text default '',
  left_hz double precision not null,
  right_hz double precision not null,
  waveform text not null default 'sine',
  fade_in_sec double precision not null default 3,
  fade_out_sec double precision not null default 3,
  master_volume double precision not null default 70,
  memo text default '',
  updated_at timestamptz not null default now()
);

create table if not exists granular_presets (
  id uuid primary key,
  name text not null,
  icon text default '',
  audio_file text not null default '',
  grain_size_ms double precision not null,
  grain_density double precision not null,
  overlap_pct double precision not null,
  position_pct double precision not null,
  randomness_pct double precision not null,
  pitch_semis double precision not null,
  lfo_enabled boolean not null default false,
  lfo_speed_hz double precision not null default 0.2,
  lfo_depth_semis double precision not null default 2,
  lfo_waveform text not null default 'sine',
  reverb_pct double precision not null default 25,
  volume double precision not null default 70,
  memo text default '',
  updated_at timestamptz not null default now()
);

alter table bb_presets enable row level security;
alter table granular_presets enable row level security;

create policy "Allow anon read bb_presets"
  on bb_presets for select
  using (true);

create policy "Allow anon write bb_presets"
  on bb_presets for all
  using (true)
  with check (true);

create policy "Allow anon read granular_presets"
  on granular_presets for select
  using (true);

create policy "Allow anon write granular_presets"
  on granular_presets for all
  using (true)
  with check (true);

create index if not exists bb_presets_updated_at_idx on bb_presets (updated_at desc);
create index if not exists granular_presets_updated_at_idx on granular_presets (updated_at desc);
