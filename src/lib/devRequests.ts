import type { CSSProperties } from "react";
import {
  getSupabaseClient,
  isSupabaseDbConfigured,
  loadSupabaseSettingsFromStorage,
  uploadAttachmentToStorage,
  type SupabaseSettings,
} from "@/src/lib/supabaseSync";

export const DEV_ATTACHMENTS_BUCKET = "attachments";
export const DEVICE_ID_KEY = "tuyukusa-device-id";

export type DevRequestAttachment = {
  storageKey: string;
  displayName: string;
  url: string;
};

export type DevRequestStatus = "open" | "in_progress" | "done";

export type DevRequest = {
  id: string;
  requester_id: string;
  requester_name: string | null;
  title: string | null;
  body: string;
  status: DevRequestStatus;
  attachments: DevRequestAttachment[];
  page_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DevRequestUpdate = {
  id: string;
  request_id: string;
  kind: "reply" | "status_change";
  body: string | null;
  new_status: string | null;
  created_at: string;
};

export type DevNotification = {
  id: string;
  requester_id: string;
  request_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type DevRequestFilter = "open" | "all" | "in_progress" | "done";

export const DEV_IMAGE_VALIDATION = {
  maxBytes: 4 * 1024 * 1024,
  allowedExtensions: ["png", "jpg", "gif", "webp"],
} as const;

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase が未設定です。設定画面で接続してください。");
  return client;
}

export function isDevRequestsAvailable(settings?: SupabaseSettings): boolean {
  return isSupabaseDbConfigured(settings ?? loadSupabaseSettingsFromStorage());
}

export function getRequesterId(): string {
  if (typeof window === "undefined") return "server";
  const syncKey = localStorage.getItem("syncKey")?.trim();
  if (syncKey) return syncKey;
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getRequesterDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("tuyukusa-user-profile");
    if (!raw) return null;
    const profile = JSON.parse(raw) as { nickname?: string; name?: string };
    const name = profile.nickname?.trim() || profile.name?.trim();
    return name || null;
  } catch {
    return null;
  }
}

export async function uploadDevRequestAttachment(file: File): Promise<DevRequestAttachment> {
  const settings = loadSupabaseSettingsFromStorage();
  const result = await uploadAttachmentToStorage(
    settings,
    DEV_ATTACHMENTS_BUCKET,
    file,
    DEV_IMAGE_VALIDATION
  );
  return {
    storageKey: result.storageKey,
    displayName: result.displayName,
    url: result.publicUrl,
  };
}

export async function createDevRequest(input: {
  body: string;
  title?: string | null;
  attachments: DevRequestAttachment[];
  pageUrl: string;
}): Promise<DevRequest> {
  const client = requireClient();
  const row = {
    requester_id: getRequesterId(),
    requester_name: getRequesterDisplayName(),
    title: input.title?.trim() || null,
    body: input.body.trim(),
    attachments: input.attachments,
    page_url: input.pageUrl,
    status: "open" as const,
  };
  const { data, error } = await client.from("dev_requests").insert(row).select().single();
  if (error) throw new Error(error.message);
  return normalizeDevRequest(data);
}

export async function fetchDevRequests(filter: DevRequestFilter): Promise<DevRequest[]> {
  const client = requireClient();
  let query = client.from("dev_requests").select("*").order("created_at", { ascending: false });
  if (filter === "open") query = query.neq("status", "done");
  else if (filter === "in_progress") query = query.eq("status", "in_progress");
  else if (filter === "done") query = query.eq("status", "done");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeDevRequest);
}

export async function fetchDevRequestUpdates(requestId: string): Promise<DevRequestUpdate[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("dev_request_updates")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DevRequestUpdate[];
}

export async function setDevRequestStatus(
  request: DevRequest,
  newStatus: DevRequestStatus,
  comment?: string
): Promise<void> {
  const client = requireClient();
  const { error: updateError } = await client
    .from("dev_requests")
    .update({ status: newStatus })
    .eq("id", request.id);
  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await client.from("dev_request_updates").insert({
    request_id: request.id,
    kind: "status_change",
    body: comment?.trim() || null,
    new_status: newStatus,
  });
  if (logError) throw new Error(logError.message);

  if (newStatus === "done") {
    const titleHint = request.title?.trim() || request.body.slice(0, 30) + (request.body.length > 30 ? "…" : "");
    const { error: notifyError } = await client.from("dev_notifications").insert({
      requester_id: request.requester_id,
      request_id: request.id,
      message: `修正完了しました（依頼: ${titleHint}）`,
    });
    if (notifyError) throw new Error(notifyError.message);
  }
}

export async function addDevRequestReply(requestId: string, body: string): Promise<void> {
  const client = requireClient();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("返信内容を入力してください");
  const { error } = await client.from("dev_request_updates").insert({
    request_id: requestId,
    kind: "reply",
    body: trimmed,
    new_status: null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchUnreadNotifications(): Promise<DevNotification[]> {
  const client = requireClient();
  const requesterId = getRequesterId();
  const { data, error } = await client
    .from("dev_notifications")
    .select("*")
    .eq("requester_id", requesterId)
    .eq("read", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DevNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("dev_notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

function normalizeDevRequest(row: unknown): DevRequest {
  const r = row as Record<string, unknown>;
  const attachments = Array.isArray(r.attachments) ? r.attachments : [];
  return {
    id: String(r.id),
    requester_id: String(r.requester_id),
    requester_name: typeof r.requester_name === "string" ? r.requester_name : null,
    title: typeof r.title === "string" ? r.title : null,
    body: String(r.body ?? ""),
    status: (r.status as DevRequestStatus) ?? "open",
    attachments: attachments.filter(isAttachment),
    page_url: typeof r.page_url === "string" ? r.page_url : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function isAttachment(value: unknown): value is DevRequestAttachment {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.storageKey === "string" &&
    typeof v.displayName === "string" &&
    typeof v.url === "string"
  );
}

export function formatDevRequestDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function statusLabel(status: DevRequestStatus): string {
  switch (status) {
    case "open":
      return "未対応";
    case "in_progress":
      return "対応中";
    case "done":
      return "完了";
  }
}

export function statusBadgeStyle(status: DevRequestStatus): CSSProperties {
  switch (status) {
    case "open":
      return { background: "#fdf0e4", color: "#8b5a2b", border: "1px solid #c17f4a" };
    case "in_progress":
      return { background: "#eef4fb", color: "#3d5a80", border: "1px solid #7ec8e3" };
    case "done":
      return { background: "#e8f0e4", color: "#4a6741", border: "1px solid #6b8f62" };
  }
}
