"use client";

import type { PresetStore, BBPreset, GranularPreset } from "@/lib/types";

const BB_KEY = "tuyukusa-mac-bb-presets";
const GR_KEY = "tuyukusa-mac-granular-presets";

export function assetUrl(relativePath: string): string {
  const origin = process.env.NEXT_PUBLIC_ASSET_ORIGIN ?? "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (relativePath.startsWith("/api/")) return `${origin}${basePath}${relativePath}`;
  if (relativePath.startsWith("/")) return `${origin}${basePath}${relativePath}`;
  return `${origin}${basePath}/api/audio/${encodeURIComponent(relativePath)}`;
}

export async function fetchBbPresets(): Promise<PresetStore<BBPreset>> {
  const res = await fetch("/api/presets/bb");
  const data = (await res.json()) as PresetStore<BBPreset>;
  if (typeof window !== "undefined" && data.presets?.length) {
    localStorage.setItem(BB_KEY, JSON.stringify(data));
  }
  return data;
}

export async function fetchGranularPresets(): Promise<PresetStore<GranularPreset>> {
  const res = await fetch("/api/presets/granular");
  const data = (await res.json()) as PresetStore<GranularPreset>;
  if (typeof window !== "undefined" && data.presets?.length) {
    localStorage.setItem(GR_KEY, JSON.stringify(data));
  }
  return data;
}

export async function saveBbPresets(store: PresetStore<BBPreset>): Promise<{ ok: boolean; message?: string }> {
  localStorage.setItem(BB_KEY, JSON.stringify(store));
  const res = await fetch("/api/presets/bb", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });
  const json = await res.json();
  return { ok: json.ok !== false, message: json.message };
}

export async function saveGranularPresets(store: PresetStore<GranularPreset>): Promise<{ ok: boolean; message?: string }> {
  localStorage.setItem(GR_KEY, JSON.stringify(store));
  const res = await fetch("/api/presets/granular", {
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

export async function fetchAudioFiles(): Promise<string[]> {
  const res = await fetch("/api/audio");
  const json = (await res.json()) as { files: string[] };
  return json.files ?? [];
}
