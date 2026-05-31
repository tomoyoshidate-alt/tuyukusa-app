"use client";

import { getMacBasePath, macApiUrl } from "@mac/lib/macBasePath";
import {
  deleteAudioFromStorage,
  fetchStudioAudioCatalog,
  uploadAudioToStorage,
  type StudioAudioEntry,
} from "@mac/lib/audioStorage";
import {
  fetchGranularPresetsFromSupabase,
  isSupabaseConfigured,
  saveBbPresetsToSupabase,
  saveGranularPresetsToSupabase,
} from "@mac/lib/presetSupabase";
import type { PresetStore, BBPreset, GranularPreset } from "@mac/lib/types";

export function assetUrl(relativePath: string): string {
  const origin = process.env.NEXT_PUBLIC_ASSET_ORIGIN ?? "";
  const basePath = getMacBasePath();
  if (relativePath.startsWith("/api/")) return `${origin}${basePath}${relativePath}`;
  if (relativePath.startsWith("/")) return `${origin}${basePath}${relativePath}`;
  return `${origin}${basePath}/api/audio/${encodeURIComponent(relativePath)}`;
}

export async function fetchBbPresets(): Promise<PresetStore<BBPreset>> {
  const res = await fetch(macApiUrl("/api/presets/bb"), { cache: "no-store" });
  const data = (await res.json()) as PresetStore<BBPreset>;
  return { presets: Array.isArray(data.presets) ? data.presets : [] };
}

export async function fetchGranularPresets(): Promise<PresetStore<GranularPreset>> {
  if (isSupabaseConfigured()) {
    try {
      return await fetchGranularPresetsFromSupabase();
    } catch (err) {
      console.error("[fetchGranularPresets supabase]", err);
    }
  }
  const res = await fetch(macApiUrl("/api/presets/granular"));
  const data = (await res.json()) as PresetStore<GranularPreset>;
  return { presets: Array.isArray(data.presets) ? data.presets : [] };
}

export async function saveBbPresets(store: PresetStore<BBPreset>): Promise<{ ok: boolean; message?: string }> {
  if (isSupabaseConfigured()) {
    try {
      await saveBbPresetsToSupabase(store);
      return { ok: true, message: "クラウドに保存しました" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `クラウド保存に失敗: ${msg}` };
    }
  }
  const res = await fetch(macApiUrl("/api/presets/bb"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });
  const json = await res.json();
  return { ok: json.ok !== false, message: json.message };
}

export async function saveGranularPresets(store: PresetStore<GranularPreset>): Promise<{ ok: boolean; message?: string }> {
  if (isSupabaseConfigured()) {
    try {
      await saveGranularPresetsToSupabase(store);
      return { ok: true, message: "クラウドに保存しました" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `クラウド保存に失敗: ${msg}` };
    }
  }
  const res = await fetch(macApiUrl("/api/presets/granular"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });
  const json = await res.json();
  return { ok: json.ok !== false, message: json.message };
}

export function exportJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function fetchAudioCatalog(): Promise<StudioAudioEntry[]> {
  return fetchStudioAudioCatalog();
}

/** @deprecated use fetchAudioCatalog */
export async function fetchAudioFiles(): Promise<string[]> {
  const catalog = await fetchAudioCatalog();
  return catalog.map(e => e.name);
}

export async function uploadAudioFile(file: File): Promise<{ ok: boolean; filename?: string; publicUrl?: string; message?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase が未設定です" };
  }
  try {
    const { filename, publicUrl } = await uploadAudioToStorage(file);
    return { ok: true, filename, publicUrl, message: `${filename} をアップロードしました` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

export async function deleteStorageAudio(filename: string): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase が未設定です" };
  }
  try {
    await deleteAudioFromStorage(filename);
    return { ok: true, message: `${filename} を削除しました` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

export type { StudioAudioEntry };

export { isSupabaseConfigured, STUDIO_PRESETS_SETUP_SQL } from "@mac/lib/presetSupabase";
export { STUDIO_AUDIO_STORAGE_SQL } from "@mac/lib/audioStorage";
