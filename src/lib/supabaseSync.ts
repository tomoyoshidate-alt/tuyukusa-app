import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { collectLocalStorageExport, importLocalStorageExport, type TuyukusaDataExport } from "./dataExport";
import { clearIntegrationSkipped } from "./integrationSkipFlags";
import {
  uploadFileToStorage,
  type FileUploadValidation,
  type StorageUploadResult,
} from "./supabaseStorageUpload";

export type SupabaseSettings = {
  url: string;
  anonKey: string;
  syncId: string;
  enabled: boolean;
  lastSyncAt?: number;
  lastError?: string;
};

export const INITIAL_SUPABASE_SETTINGS: SupabaseSettings = {
  url: "",
  anonKey: "",
  syncId: "",
  enabled: false,
};

export function normalizeSupabaseSettings(data: unknown): SupabaseSettings {
  if (!data || typeof data !== "object") return { ...INITIAL_SUPABASE_SETTINGS };
  const d = data as Partial<SupabaseSettings>;
  return {
    url: typeof d.url === "string" ? d.url.trim() : "",
    anonKey: typeof d.anonKey === "string" ? d.anonKey.trim() : "",
    syncId: typeof d.syncId === "string" ? d.syncId.trim() : "",
    enabled: d.enabled === true,
    lastSyncAt: typeof d.lastSyncAt === "number" ? d.lastSyncAt : undefined,
    lastError: typeof d.lastError === "string" ? d.lastError : undefined,
  };
}

export function isSupabaseConfigured(settings: SupabaseSettings): boolean {
  return Boolean(settings.url && settings.anonKey && settings.syncId);
}

/** Persist Supabase credentials to localStorage (structured + flat keys). */
export function applySupabaseConnection(url: string, anonKey: string, syncKey: string): SupabaseSettings {
  const settings: SupabaseSettings = {
    url: url.trim(),
    anonKey: anonKey.trim(),
    syncId: syncKey.trim(),
    enabled: true,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("tuyukusa-supabase", JSON.stringify(settings));
    localStorage.setItem("supabaseUrl", settings.url);
    localStorage.setItem("supabaseAnonKey", settings.anonKey);
    localStorage.setItem("syncKey", settings.syncId);
    localStorage.setItem("supabaseConnected", "true");
    clearIntegrationSkipped("supabase");
  }

  return settings;
}

export function isSupabaseConnectedInStorage(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("supabaseConnected") === "true") return true;
  try {
    const raw = localStorage.getItem("tuyukusa-supabase");
    if (!raw) return false;
    return isSupabaseConfigured(normalizeSupabaseSettings(JSON.parse(raw)));
  } catch {
    return false;
  }
}

function createSupabaseClient(settings: SupabaseSettings): SupabaseClient {
  return createClient(settings.url, settings.anonKey);
}

type SyncRow = {
  sync_id: string;
  payload: TuyukusaDataExport;
  updated_at: string;
};

export async function pushToSupabase(settings: SupabaseSettings): Promise<void> {
  if (!isSupabaseConfigured(settings)) throw new Error("Supabase is not configured");

  const client = createSupabaseClient(settings);
  const payload = collectLocalStorageExport();
  const row: SyncRow = {
    sync_id: settings.syncId,
    payload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from("tuyukusa_sync").upsert(row, { onConflict: "sync_id" });
  if (error) throw new Error(error.message);
}

export async function pullFromSupabase(settings: SupabaseSettings): Promise<TuyukusaDataExport | null> {
  if (!isSupabaseConfigured(settings)) throw new Error("Supabase is not configured");

  const client = createSupabaseClient(settings);
  const { data, error } = await client
    .from("tuyukusa_sync")
    .select("payload")
    .eq("sync_id", settings.syncId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.payload) return null;
  return data.payload as TuyukusaDataExport;
}

export async function syncWithSupabase(
  settings: SupabaseSettings,
  direction: "push" | "pull" | "merge"
): Promise<{ pulled: boolean; pushed: boolean }> {
  let pulled = false;
  let pushed = false;

  if (direction === "pull" || direction === "merge") {
    const remote = await pullFromSupabase(settings);
    if (remote) {
      importLocalStorageExport(remote);
      pulled = true;
    }
  }

  if (direction === "push" || direction === "merge") {
    await pushToSupabase(settings);
    pushed = true;
  }

  return { pulled, pushed };
}

export const SUPABASE_SETUP_SQL = `-- Supabase SQL Editor で実行してください
create table if not exists tuyukusa_sync (
  sync_id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table tuyukusa_sync enable row level security;

create policy "Allow anon sync"
  on tuyukusa_sync for all
  using (true)
  with check (true);`;

/** 添付ファイルを Storage にアップロード（キーは uploads/uuid.ext、表示名は metadata に保存） */
export async function uploadAttachmentToStorage(
  settings: SupabaseSettings,
  bucket: string,
  file: File,
  validation?: FileUploadValidation
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured(settings)) throw new Error("Supabase is not configured");
  const client = createSupabaseClient(settings);
  return uploadFileToStorage(client, bucket, file, validation);
}
