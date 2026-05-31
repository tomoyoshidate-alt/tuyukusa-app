import { getSupabase, isSupabaseConfigured } from "@mac/lib/supabaseClient";
import { getMacBasePath, macApiUrl } from "@mac/lib/macBasePath";

export const AUDIO_BUCKET = "audio";

const ALLOWED_EXT = /\.(mp3|wav)$/i;
const MAX_BYTES = 50 * 1024 * 1024;

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

export function sanitizeAudioFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim();
  if (!ALLOWED_EXT.test(base)) {
    throw new Error("MP3 または WAV のみアップロードできます");
  }
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getStoragePublicUrl(filename: string): string | null {
  const sb = getSupabase();
  if (!sb) return null;
  const safe = sanitizeAudioFilename(filename);
  const { data } = sb.storage.from(AUDIO_BUCKET).getPublicUrl(safe);
  return data.publicUrl;
}

/** Playback URL for granular engine (Supabase public URL or /mac/api/audio proxy). */
export function resolveStudioAudioUrl(filename: string, audioBaseUrl?: string): string {
  const safe = filename.replace(/^audio\//, "");
  if (!safe) return "";
  if (isSupabaseConfigured()) {
    const publicUrl = getStoragePublicUrl(safe);
    if (publicUrl) return publicUrl;
  }
  if (audioBaseUrl) {
    return `${audioBaseUrl.replace(/\/$/, "")}/api/audio/${encodeURIComponent(safe)}`;
  }
  return macApiUrl(`/api/audio/${encodeURIComponent(safe)}`);
}

export async function listStorageAudioFiles(): Promise<string[]> {
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
    .sort((a, b) => a.localeCompare(b));
}

export async function uploadAudioToStorage(file: File): Promise<{ filename: string }> {
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
  return { filename };
}

/** Server-side: list local public/audio + storage when configured. */
export async function listAllAudioFiles(localFiles: string[]): Promise<string[]> {
  if (!isSupabaseConfigured()) return localFiles;
  try {
    const sb = getSupabase();
    if (!sb) return localFiles;
    const { data, error } = await sb.storage.from(AUDIO_BUCKET).list("", { limit: 1000 });
    if (error) return localFiles;
    const remote = (data ?? [])
      .map(item => item.name)
      .filter((name): name is string => Boolean(name && ALLOWED_EXT.test(name)));
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
