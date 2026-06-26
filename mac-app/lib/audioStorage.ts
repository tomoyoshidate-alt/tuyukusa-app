import { getSupabase, isSupabaseConfigured } from "@mac/lib/supabaseClient";
import { getMacBasePath, macApiUrl } from "@mac/lib/macBasePath";
import {
  displayNameFromStorageMetadata,
  extractFileExtension,
  uploadFileToStorage,
  type StorageUploadResult,
} from "../../src/lib/supabaseStorageUpload";

export const AUDIO_BUCKET = "audio";

const ALLOWED_AUDIO_EXT = ["mp3", "wav"] as const;
const MAX_BYTES = 50 * 1024 * 1024;

export type StudioAudioEntry = {
  /** Storage キーまたはローカルファイル名 */
  name: string;
  /** UI 表示用（アップロード時の元ファイル名） */
  label?: string;
  url: string;
  source: "storage" | "local";
};

export type AudioStorageUploadResult = StorageUploadResult & {
  /** @deprecated storageKey を使用 */
  filename: string;
};

export const STUDIO_AUDIO_STORAGE_SQL = `-- Supabase SQL Editor で実行（Storage バケット audio）
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;

create policy "Public read studio audio"
  on storage.objects for select
  using (bucket_id = 'audio');

create policy "Anon upload studio audio"
  on storage.objects for insert
  with check (bucket_id = 'audio');

create policy "Anon update studio audio"
  on storage.objects for update
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');

create policy "Anon delete studio audio"
  on storage.objects for delete
  using (bucket_id = 'audio');`;

export function isHttpAudioUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function studioEntryLabel(entry: StudioAudioEntry): string {
  return entry.label ?? entry.name.replace(/^uploads\//, "");
}

export function filenameFromStorageUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/public/${AUDIO_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + marker.length));
    }
    const parts = u.pathname.split("/");
    const bucketIdx = parts.indexOf(AUDIO_BUCKET);
    if (bucketIdx >= 0 && parts[bucketIdx + 1]) {
      return decodeURIComponent(parts.slice(bucketIdx + 1).join("/"));
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getStoragePublicUrl(storageKey: string): string | null {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = sb.storage.from(AUDIO_BUCKET).getPublicUrl(storageKey);
  return data.publicUrl;
}

/** Resolve playback URL from audioFile (full URL or filename). */
export function resolveStudioAudioUrl(audioFile: string, audioBaseUrl?: string): string {
  const value = audioFile.trim();
  if (!value) return "";
  if (isHttpAudioUrl(value)) return value;

  const safe = value.replace(/^audio\//, "");
  if (isSupabaseConfigured()) {
    const publicUrl = getStoragePublicUrl(safe);
    if (publicUrl) return publicUrl;
  }
  if (audioBaseUrl) {
    return `${audioBaseUrl.replace(/\/$/, "")}/api/audio/${encodeURIComponent(safe)}`;
  }
  return macApiUrl(`/api/audio/${encodeURIComponent(safe)}`);
}

/** Normalize audioFile values (URL, path, or filename) for comparison. */
export function normalizeAudioFileKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isHttpAudioUrl(trimmed)) {
    const filename = filenameFromStorageUrl(trimmed);
    return (filename ?? trimmed).toLowerCase();
  }
  return trimmed.replace(/^audio\//, "").toLowerCase();
}

/** True when two audioFile values refer to the same source. */
export function audioFilesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  if (a.trim() === b.trim()) return true;
  if (normalizeAudioFileKey(a) === normalizeAudioFileKey(b)) return true;
  try {
    return resolveStudioAudioUrl(a) === resolveStudioAudioUrl(b);
  } catch {
    return false;
  }
}

function isAllowedAudioFile(file: File): boolean {
  const ext = extractFileExtension(file.name, file.type);
  return (ALLOWED_AUDIO_EXT as readonly string[]).includes(ext);
}

async function listStorageFolder(prefix: string): Promise<StudioAudioEntry[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const { data, error } = await sb.storage.from(AUDIO_BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);

  const entries: StudioAudioEntry[] = [];
  for (const item of data ?? []) {
    if (!item.name || item.name.endsWith("/")) continue;
    const storageKey = prefix ? `${prefix}/${item.name}` : item.name;
    const ext = extractFileExtension(item.name);
    if (!(ALLOWED_AUDIO_EXT as readonly string[]).includes(ext)) continue;
    const label = displayNameFromStorageMetadata(item.metadata, item.name);
    entries.push({
      name: storageKey,
      label: label !== item.name ? label : undefined,
      url: getStoragePublicUrl(storageKey) ?? storageKey,
      source: "storage",
    });
  }
  return entries;
}

export async function listStorageAudioEntries(): Promise<StudioAudioEntry[]> {
  const [legacyRoot, uploads] = await Promise.all([
    listStorageFolder("").catch(() => [] as StudioAudioEntry[]),
    listStorageFolder("uploads").catch(() => [] as StudioAudioEntry[]),
  ]);
  const byKey = new Map<string, StudioAudioEntry>();
  for (const entry of [...legacyRoot, ...uploads]) {
    if (!entry.name.startsWith("uploads/")) {
      const ext = extractFileExtension(entry.name);
      if (!(ALLOWED_AUDIO_EXT as readonly string[]).includes(ext)) continue;
    }
    byKey.set(entry.name, entry);
  }
  return [...byKey.values()].sort((a, b) => studioEntryLabel(a).localeCompare(studioEntryLabel(b)));
}

export async function listStorageAudioFiles(): Promise<string[]> {
  const entries = await listStorageAudioEntries();
  return entries.map(e => e.name);
}

export async function uploadAudioToStorage(file: File): Promise<AudioStorageUploadResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  if (!isAllowedAudioFile(file)) {
    throw new Error("MP3 または WAV のみアップロードできます");
  }

  const result = await uploadFileToStorage(sb, AUDIO_BUCKET, file, {
    maxBytes: MAX_BYTES,
    allowedExtensions: ALLOWED_AUDIO_EXT,
  });

  return { ...result, filename: result.storageKey };
}

export async function deleteAudioFromStorage(storageKey: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb.storage.from(AUDIO_BUCKET).remove([storageKey]);
  if (error) throw new Error(error.message);
}

export async function fetchStudioAudioCatalog(): Promise<StudioAudioEntry[]> {
  const localRes = await fetch(
    typeof window !== "undefined" ? macApiUrl("/api/audio") : "/mac/api/audio",
    { cache: "no-store" }
  ).catch(() => null);
  const localJson = localRes?.ok ? ((await localRes.json()) as { files: string[] }) : { files: [] };
  const localEntries: StudioAudioEntry[] = (localJson.files ?? [])
    .filter(f => /\.(mp3|wav)$/i.test(f))
    .map(name => ({
      name,
      url: typeof window !== "undefined" ? macApiUrl(`/api/audio/${encodeURIComponent(name)}`) : name,
      source: "local" as const,
    }));

  if (!isSupabaseConfigured()) {
    return localEntries.sort((a, b) => a.name.localeCompare(b.name));
  }

  try {
    const remote = await listStorageAudioEntries();
    const byName = new Map<string, StudioAudioEntry>();
    for (const entry of localEntries) byName.set(entry.name, entry);
    for (const entry of remote) byName.set(entry.name, entry);
    return [...byName.values()].sort((a, b) => studioEntryLabel(a).localeCompare(studioEntryLabel(b)));
  } catch {
    return localEntries.sort((a, b) => a.name.localeCompare(b.name));
  }
}

/** Server-side: list local public/audio + storage when configured. */
export async function listAllAudioFiles(localFiles: string[]): Promise<string[]> {
  if (!isSupabaseConfigured()) return localFiles;
  try {
    const remote = await listStorageAudioFiles();
    return [...new Set([...localFiles, ...remote])].sort((a, b) => a.localeCompare(b));
  } catch {
    return localFiles;
  }
}

export async function fetchStorageAudioBuffer(storageKey: string): Promise<ArrayBuffer | null> {
  const url = getStoragePublicUrl(storageKey);
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export function audioFileLabel(audioFile: string): string {
  if (!audioFile) return "";
  if (isHttpAudioUrl(audioFile)) {
    return filenameFromStorageUrl(audioFile) ?? audioFile.split("/").pop() ?? audioFile;
  }
  return audioFile.replace(/^uploads\//, "").replace(/^audio\//, "");
}

/** @deprecated use studioEntryLabel / uploadFileToStorage */
export function sanitizeAudioFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim();
  if (!/\.(mp3|wav)$/i.test(base)) {
    throw new Error("MP3 または WAV のみアップロードできます");
  }
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}
