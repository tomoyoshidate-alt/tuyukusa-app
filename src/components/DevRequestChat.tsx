"use client";

import { useCallback, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { usePathname } from "next/navigation";
import {
  createDevRequest,
  isDevRequestsAvailable,
  uploadDevRequestAttachment,
  type DevRequestAttachment,
} from "@/src/lib/devRequests";
import { themeCardStyle, themeInputStyle } from "@/src/lib/themeStyles";

const MAX_ATTACHMENTS = 5;

export function DevRequestChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<DevRequestAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const available = isDevRequestsAvailable();

  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files?.length || uploading) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (attachments.length >= MAX_ATTACHMENTS) {
          setError(`添付は${MAX_ATTACHMENTS}件までです`);
          break;
        }
        const att = await uploadDevRequestAttachment(file);
        setAttachments(prev => [...prev, att]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  }, [attachments.length, uploading]);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const hasImage = Array.from(items).some(item => item.type.startsWith("image/"));
      if (!hasImage) return;
      e.preventDefault();
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      void addFiles(files);
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      void addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeAttachment = (storageKey: string) => {
    setAttachments(prev => prev.filter(a => a.storageKey !== storageKey));
  };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("依頼内容を入力してください");
      return;
    }
    if (!available) {
      setError("Supabase が未設定です");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createDevRequest({
        body: trimmed,
        attachments,
        pageUrl: typeof window !== "undefined" ? window.location.href : pathname ?? "/",
      });
      setBody("");
      setAttachments([]);
      setOpen(false);
      setToast("依頼を受け付けました");
      setTimeout(() => setToast(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (pathname === "/dev-requests") return null;

  return (
    <>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: open ? 420 : 88,
            right: 20,
            zIndex: 10002,
            background: "#4a6741",
            color: "#f5f0e8",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            zIndex: 10001,
            width: "min(360px, calc(100vw - 32px))",
            ...themeCardStyle,
            marginBottom: 0,
            padding: 16,
            boxShadow: "0 8px 32px rgba(44,32,22,0.18)",
          }}
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)" }}>開発チームへ依頼</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              style={{
                border: "none",
                background: "transparent",
                fontSize: 18,
                cursor: "pointer",
                color: "var(--t-text-muted)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {!available && (
            <p style={{ fontSize: 12, color: "#c44a4a", margin: "0 0 10px", lineHeight: 1.5 }}>
              Supabase 未設定のため送信できません。設定画面でクラウド同期を設定してください。
            </p>
          )}

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onPaste={handlePaste}
            placeholder="修正してほしい内容を具体的に…（スクショは貼り付け・ドロップ可）"
            rows={5}
            style={{
              ...themeInputStyle,
              resize: "vertical",
              minHeight: 100,
              marginBottom: 10,
              background: dragOver ? "var(--t-accent-bg)" : "var(--t-input-bg)",
            }}
          />

          <div
            style={{
              border: `1.5px dashed ${dragOver ? "var(--t-primary)" : "var(--t-border)"}`,
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 10,
              fontSize: 11,
              color: "var(--t-text-muted)",
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "アップロード中…" : "画像をドロップ / クリックして選択 / Ctrl+V で貼り付け"}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={e => void addFiles(e.target.files)}
          />

          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {attachments.map(att => (
                <div key={att.storageKey} style={{ position: "relative" }}>
                  <img
                    src={att.url}
                    alt={att.displayName}
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid var(--t-border)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.storageKey)}
                    aria-label="削除"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "#1a1410",
                      color: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p style={{ fontSize: 11, color: "#c44a4a", margin: "0 0 8px" }}>{error}</p>
          )}

          <button
            type="button"
            disabled={submitting || !available || uploading}
            onClick={() => void handleSubmit()}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: submitting || !available ? "#9a8b7a" : "var(--t-primary)",
              color: "#fff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: submitting || !available ? "default" : "pointer",
            }}
          >
            {submitting ? "送信中…" : "送信"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 10000,
          padding: "12px 16px",
          borderRadius: 24,
          border: "none",
          background: "#4a6741",
          color: "#f5f0e8",
          fontSize: 13,
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        開発チームへ依頼
      </button>
    </>
  );
}
