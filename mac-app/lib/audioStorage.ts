import { getSupabase, isSupabaseConfigured } from "@mac/lib/supabaseClient";
import { getMacBasePath, macApiUrl } from "@mac/lib/macBasePath";

export const AUDIO_BUCKET = "audio";

const ALLOWED_EXT = /\.(mp3|wav)$/i;
const MAX_BYTES = 50 * 1024 * 1024;

export type StudioAudioEntry = {
  name: string;
  url: string;
  source: "storage" | "local";
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

export function sanitizeAudioFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim();
  if (!ALLOWED_EXT.test(base)) {
    throw new Error("MP3 または WAV のみアップロードできます");
  }
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
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

export function getStoragePublicUrl(filename: string): string | null {
  const sb = getSupabase();
  if (!sb) return null;
  const safe = sanitizeAudioFilename(filename);
  const { data } = sb.storage.from(AUDIO_BUCKET).getPublicUrl(safe);
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

export async function listStorageAudioEntries(): Promise<StudioAudioEntry[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data, error } = await sb.storage.from(AUDIO_BUCKET).list("", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(item => item.name)
    .filter((name): name is string => Boolean(name && ALLOWED_EXT.test(name)))
    .map(name => ({
      name,
      url: getStoragePublicUrl(name) ?? name,
      source: "storage" as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listStorageAudioFiles(): Promise<string[]> {
  const entries = await listStorageAudioEntries();
  return entries.map(e => e.name);
}

export async function uploadAudioToStorage(file: File): Promise<{ filename: string; publicUrl: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  if (!ALLOWED_EXT.test(file.name)) {
    throw new Error("MP3 または WAV のみアップロードできます");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("ファイルサイズは 50MB 以下にしてください");
  }
  const filename = sanitizeAudioFilename(file.name);
  const contentType = file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg";
  const { error } = await sb.storage.from(AUDIO_BUCKET).upload(filename, file, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(error.message);
  const publicUrl = getStoragePublicUrl(filename);
  if (!publicUrl) throw new Error("公開 URL の取得に失敗しました");
  return { filename, publicUrl };
}

export async function deleteAudioFromStorage(filename: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const safe = sanitizeAudioFilename(filename);
  const { error } = await sb.storage.from(AUDIO_BUCKET).remove([safe]);
  if (error) throw new Error(error.message);
}

export async function fetchStudioAudioCatalog(): Promise<StudioAudioEntry[]> {
  const localRes = await fetch(
    typeof window !== "undefined" ? macApiUrl("/api/audio") : "/mac/api/audio",
    { cache: "no-store" }
  ).catch(() => null);
  const localJson = localRes?.ok ? ((await localRes.json()) as { files: string[] }) : { files: [] };
  const localEntries: StudioAudioEntry[] = (localJson.files ?? [])
    .filter(f => ALLOWED_EXT.test(f))
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
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
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

export async function fetchStorageAudioBuffer(filename: string): Promise<ArrayBuffer | null> {
  const url = getStoragePublicUrl(filename);
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
  return audioFile.replace(/^audio\//, "");
}
