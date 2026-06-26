"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchUnreadNotifications,
  isDevRequestsAvailable,
  markNotificationRead,
  type DevNotification,
} from "@/src/lib/devRequests";

const POLL_MS = 30_000;

export function DevRequestNotifications() {
  const [queue, setQueue] = useState<DevNotification[]>([]);
  const [visible, setVisible] = useState<DevNotification | null>(null);

  const poll = useCallback(async () => {
    if (!isDevRequestsAvailable()) return;
    try {
      const unread = await fetchUnreadNotifications();
      setQueue(unread);
      setVisible(prev => {
        if (prev) return prev;
        return unread[0] ?? null;
      });
    } catch {
      /* ignore network errors during poll */
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const dismiss = async (notification: DevNotification, reload?: boolean) => {
    try {
      await markNotificationRead(notification.id);
    } catch {
      /* ignore */
    }
    setQueue(prev => {
      const remaining = prev.filter(n => n.id !== notification.id);
      setVisible(remaining[0] ?? null);
      return remaining;
    });
    if (reload) window.location.reload();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10003,
        width: "min(420px, calc(100vw - 32px))",
        background: "#f5f0e8",
        border: "1.5px solid #6b8f62",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: "bold", color: "#4a6741", marginBottom: 6 }}>
        お知らせ
      </div>
      <div style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.6, marginBottom: 12 }}>
        {visible.message}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void dismiss(visible, true)}
          style={{
            flex: 1,
            minWidth: 120,
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            background: "#4a6741",
            color: "#fff",
            fontSize: 13,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          画面を更新
        </button>
        <button
          type="button"
          onClick={() => void dismiss(visible, false)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1.5px solid rgba(60,40,20,0.15)",
            background: "white",
            color: "#3d3228",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
