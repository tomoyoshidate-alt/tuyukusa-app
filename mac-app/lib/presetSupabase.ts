import { getSupabase, isSupabaseConfigured } from "@mac/lib/supabaseClient";
import type { BBPreset, GranularPreset, PresetStore } from "@mac/lib/types";

export { isSupabaseConfigured };

export const STUDIO_PRESETS_SETUP_SQL = `-- Supabase SQL Editor で実行してください
-- ファイル: supabase/studio_presets.sql

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
  on bb_presets for select using (true);

create policy "Allow anon write bb_presets"
  on bb_presets for all using (true) with check (true);

create policy "Allow anon read granular_presets"
  on granular_presets for select using (true);

create policy "Allow anon write granular_presets"
  on granular_presets for all using (true) with check (true);`;

type BbPresetRow = {
  id: string;
  name: string;
  icon: string | null;
  left_hz: number;
  right_hz: number;
  waveform: string;
  fade_in_sec: number;
  fade_out_sec: number;
  master_volume: number;
  memo: string | null;
  updated_at: string;
};

type GranularPresetRow = {
  id: string;
  name: string;
  icon: string | null;
  audio_file: string;
  grain_size_ms: number;
  grain_density: number;
  overlap_pct: number;
  position_pct: number;
  randomness_pct: number;
  pitch_semis: number;
  lfo_enabled: boolean;
  lfo_speed_hz: number;
  lfo_depth_semis: number;
  lfo_waveform: string;
  reverb_pct: number;
  volume: number;
  memo: string | null;
  updated_at: string;
};

function bbToRow(p: BBPreset): BbPresetRow {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon ?? "",
    left_hz: p.leftHz,
    right_hz: p.rightHz,
    waveform: p.waveform,
    fade_in_sec: p.fadeInSec,
    fade_out_sec: p.fadeOutSec,
    master_volume: p.masterVolume,
    memo: p.memo ?? "",
    updated_at: p.updatedAt,
  };
}

function bbFromRow(r: BbPresetRow): BBPreset {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon ?? "",
    leftHz: r.left_hz,
    rightHz: r.right_hz,
    waveform: r.waveform as BBPreset["waveform"],
    fadeInSec: r.fade_in_sec,
    fadeOutSec: r.fade_out_sec,
    masterVolume: r.master_volume,
    memo: r.memo ?? "",
    updatedAt: r.updated_at,
  };
}

function granularToRow(p: GranularPreset): GranularPresetRow {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon ?? "",
    audio_file: p.audioFile,
    grain_size_ms: p.grainSizeMs,
    grain_density: p.grainDensity,
    overlap_pct: p.overlapPct,
    position_pct: p.positionPct,
    randomness_pct: p.randomnessPct,
    pitch_semis: p.pitchSemis,
    lfo_enabled: p.lfoEnabled,
    lfo_speed_hz: p.lfoSpeedHz,
    lfo_depth_semis: p.lfoDepthSemis,
    lfo_waveform: p.lfoWaveform,
    reverb_pct: p.reverbPct,
    volume: p.volume,
    memo: p.memo ?? "",
    updated_at: p.updatedAt,
  };
}

function granularFromRow(r: GranularPresetRow): GranularPreset {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon ?? "",
    audioFile: r.audio_file,
    grainSizeMs: r.grain_size_ms,
    grainDensity: r.grain_density,
    overlapPct: r.overlap_pct,
    positionPct: r.position_pct,
    randomnessPct: r.randomness_pct,
    pitchSemis: r.pitch_semis,
    lfoEnabled: r.lfo_enabled,
    lfoSpeedHz: r.lfo_speed_hz,
    lfoDepthSemis: r.lfo_depth_semis,
    lfoWaveform: r.lfo_waveform as GranularPreset["lfoWaveform"],
    reverbPct: r.reverb_pct,
    volume: r.volume,
    memo: r.memo ?? "",
    updatedAt: r.updated_at,
  };
}

async function removeOrphans(table: "bb_presets" | "granular_presets", keepIds: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb.from(table).select("id");
  if (error) throw new Error(error.message);
  const toDelete = (data ?? []).map(r => r.id as string).filter(id => !keepIds.includes(id));
  if (toDelete.length === 0) return;
  const { error: delError } = await sb.from(table).delete().in("id", toDelete);
  if (delError) throw new Error(delError.message);
}

export async function fetchBbPresetsFromSupabase(): Promise<PresetStore<BBPreset>> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data, error } = await sb
    .from("bb_presets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { presets: (data as BbPresetRow[] | null)?.map(bbFromRow) ?? [] };
}

export async function fetchGranularPresetsFromSupabase(): Promise<PresetStore<GranularPreset>> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data, error } = await sb
    .from("granular_presets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { presets: (data as GranularPresetRow[] | null)?.map(granularFromRow) ?? [] };
}

export async function saveBbPresetsToSupabase(store: PresetStore<BBPreset>): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const rows = store.presets.map(bbToRow);
  if (rows.length > 0) {
    const { error } = await sb.from("bb_presets").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  await removeOrphans("bb_presets", store.presets.map(p => p.id));
}

export async function saveGranularPresetsToSupabase(store: PresetStore<GranularPreset>): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const rows = store.presets.map(granularToRow);
  if (rows.length > 0) {
    const { error } = await sb.from("granular_presets").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  await removeOrphans("granular_presets", store.presets.map(p => p.id));
}
