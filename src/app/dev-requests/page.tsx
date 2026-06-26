"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  addDevRequestReply,
  fetchDevRequestUpdates,
  fetchDevRequests,
  formatDevRequestDate,
  isDevRequestsAvailable,
  setDevRequestStatus,
  statusBadgeStyle,
  statusLabel,
  type DevRequest,
  type DevRequestFilter,
  type DevRequestUpdate,
} from "@/src/lib/devRequests";
import {
  themeAppShellStyle,
  themeCardStyle,
  themeFieldLabelStyle,
  themeHeaderStyle,
  themeInputStyle,
  themeMutedTextStyle,
} from "@/src/lib/themeStyles";

const FILTERS: { id: DevRequestFilter; label: string }[] = [
  { id: "open", label: "未完了" },
  { id: "all", label: "すべて" },
  { id: "in_progress", label: "対応中" },
  { id: "done", label: "完了" },
];

function updateKindLabel(kind: DevRequestUpdate["kind"], newStatus: string | null): string {
  if (kind === "reply") return "返信";
  if (newStatus === "in_progress") return "確認中に変更";
  if (newStatus === "done") return "対応済み（修正完了）";
  if (newStatus === "open") return "未対応に戻す";
  return "ステータス変更";
}

function DevRequestCard({
  request,
  onChanged,
}: {
  request: DevRequest;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updates, setUpdates] = useState<DevRequestUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadUpdates = useCallback(async () => {
    setLoadingUpdates(true);
    try {
      const rows = await fetchDevRequestUpdates(request.id);
      setUpdates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "履歴の取得に失敗しました");
    } finally {
      setLoadingUpdates(false);
    }
  }, [request.id]);

  useEffect(() => {
    if (expanded) void loadUpdates();
  }, [expanded, loadUpdates]);

  const runStatus = async (status: DevRequest["status"]) => {
    setBusy(true);
    setError("");
    try {
      await setDevRequestStatus(request, status);
      await loadUpdates();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async () => {
    setBusy(true);
    setError("");
    try {
      await addDevRequestReply(request.id, reply);
      setReply("");
      await loadUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "返信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const title = request.title?.trim() || "(タイトルなし)";

  return (
    <div style={{ ...themeCardStyle, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)", flex: 1 }}>{title}</div>
        <span
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 12,
            flexShrink: 0,
            ...statusBadgeStyle(request.status),
          }}
        >
          {statusLabel(request.status)}
        </span>
      </div>

      <div style={{ fontSize: 13, color: "var(--t-text)", lineHeight: 1.65, whiteSpace: "pre-wrap", marginBottom: 10 }}>
        {request.body}
      </div>

      {request.attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {request.attachments.map(att => (
            <a key={att.storageKey} href={att.url} target="_blank" rel="noopener noreferrer">
              <img
                src={att.url}
                alt={att.displayName}
                style={{
                  width: 88,
                  height: 88,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid var(--t-border)",
                }}
              />
            </a>
          ))}
        </div>
      )}

      <div style={{ ...themeMutedTextStyle, marginBottom: 8 }}>
        登録: {request.requester_name || "（名前なし）"} / {formatDevRequestDate(request.created_at)}
      </div>

      {request.page_url && (
        <a
          href={request.page_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--t-primary)", wordBreak: "break-all" }}
        >
          {request.page_url}
        </a>
      )}

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          marginTop: 10,
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid var(--t-border)",
          background: "var(--t-input-bg)",
          fontSize: 12,
          color: "var(--t-text-muted)",
          cursor: "pointer",
        }}
      >
        {expanded ? "履歴を閉じる" : "対応履歴・操作"}
      </button>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--t-border)" }}>
          <div style={themeFieldLabelStyle}>対応履歴</div>
          {loadingUpdates ? (
            <p style={themeMutedTextStyle}>読み込み中…</p>
          ) : updates.length === 0 ? (
            <p style={themeMutedTextStyle}>まだ履歴がありません</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
              {updates.map(u => (
                <li
                  key={u.id}
                  style={{
                    fontSize: 12,
                    padding: "8px 10px",
                    marginBottom: 6,
                    background: "var(--t-accent-bg, #f5f0e8)",
                    borderRadius: 8,
                    border: "1px solid var(--t-border)",
                  }}
                >
                  <div style={{ color: "var(--t-primary)", fontWeight: "bold", marginBottom: 4 }}>
                    {updateKindLabel(u.kind, u.new_status)} · {formatDevRequestDate(u.created_at)}
                  </div>
                  {u.body && (
                    <div style={{ color: "var(--t-text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{u.body}</div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {request.status !== "in_progress" && request.status !== "done" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runStatus("in_progress")}
                style={actionBtnStyle("#3d5a80", "#eef4fb")}
              >
                確認中にする
              </button>
            )}
            {request.status !== "done" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runStatus("done")}
                style={actionBtnStyle("#4a6741", "#e8f0e4")}
              >
                対応済みにする（修正完了）
              </button>
            )}
          </div>

          <div style={themeFieldLabelStyle}>返信（開発側コメント）</div>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder="対応内容や確認事項など"
            style={{ ...themeInputStyle, resize: "vertical", marginBottom: 8 }}
          />
          <button
            type="button"
            disabled={busy || !reply.trim()}
            onClick={() => void submitReply()}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: busy || !reply.trim() ? "#9a8b7a" : "var(--t-primary)",
              color: "#fff",
              fontSize: 13,
              fontWeight: "bold",
              cursor: busy || !reply.trim() ? "default" : "pointer",
            }}
          >
            返信を追加
          </button>

          {error && <p style={{ fontSize: 11, color: "#c44a4a", marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(color: string, bg: string) {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1.5px solid ${color}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: "bold" as const,
    cursor: "pointer",
  };
}

export default function DevRequestsPage() {
  const [filter, setFilter] = useState<DevRequestFilter>("open");
  const [requests, setRequests] = useState<DevRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const available = isDevRequestsAvailable();

  const load = useCallback(async () => {
    if (!available) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await fetchDevRequests(filter);
      setRequests(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filter, available]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={themeAppShellStyle}>
      <header style={themeHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>開発依頼</span>
          <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
            ← アプリへ
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: "12px 16px 24px" }}>
        {!available && (
          <div style={{ ...themeCardStyle, color: "#c44a4a", fontSize: 13, lineHeight: 1.6 }}>
            Supabase が未設定です。設定画面でクラウド同期（URL・anon key）を設定してください。
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {FILTERS.map(f => {
            const selected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 20,
                  border: selected ? "1.5px solid #6b8f62" : "1.5px solid var(--t-border)",
                  background: selected ? "#e8f0e4" : "var(--t-card-bg)",
                  color: selected ? "#4a6741" : "var(--t-text-muted)",
                  fontSize: 12,
                  fontWeight: selected ? "bold" : "normal",
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading && <p style={themeMutedTextStyle}>読み込み中…</p>}
        {error && <p style={{ fontSize: 13, color: "#c44a4a" }}>{error}</p>}

        {!loading && !error && requests.length === 0 && (
          <div style={{ ...themeCardStyle, textAlign: "center", color: "var(--t-text-muted)", fontSize: 13 }}>
            該当する依頼はありません
          </div>
        )}

        {requests.map(req => (
          <DevRequestCard key={req.id} request={req} onChanged={() => void load()} />
        ))}
      </main>
    </div>
  );
}
