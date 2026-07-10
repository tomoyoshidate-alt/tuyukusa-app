"use client";

import { useEffect, useState } from "react";
import { themeCardStyle } from "@/src/lib/themeStyles";
import { enablePushNotifications, isPushConfigured } from "@/src/lib/push/subscribe";

type Status = "idle" | "working" | "enabled" | "error" | "denied" | "unsupported";

// プッシュ通知の有効化トグル。
// NEXT_PUBLIC_VAPID_PUBLIC_KEY 未設定なら null を返し、UI に一切表示されない。
export function PushNotificationToggle() {
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    setConfigured(isPushConfigured());
  }, []);

  if (!configured) return null;

  async function onEnable() {
    setStatus("working");
    const r = await enablePushNotifications();
    if (r.ok) {
      setStatus("enabled");
    } else if (r.reason === "denied") {
      setStatus("denied");
    } else if (r.reason === "unsupported") {
      setStatus("unsupported");
    } else {
      setStatus("error");
    }
  }

  return (
    <div style={{ ...themeCardStyle, marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)", marginBottom: 4 }}>
        プッシュ通知
      </div>
      <div style={{ fontSize: 12, color: "var(--t-text-muted)", lineHeight: 1.5, marginBottom: 10 }}>
        朝のブリーフィングや就寝前の塩湯リマインドを、通知で受け取れます。
      </div>
      <button
        onClick={onEnable}
        disabled={status === "working" || status === "enabled"}
        style={{
          appearance: "none",
          border: "1px solid var(--t-border, rgba(0,0,0,0.15))",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: "bold",
          color: "var(--t-text)",
          background: "var(--t-surface, transparent)",
          cursor: status === "working" || status === "enabled" ? "default" : "pointer",
          opacity: status === "working" ? 0.6 : 1,
        }}
      >
        {status === "enabled"
          ? "通知は有効です"
          : status === "working"
            ? "設定中…"
            : "通知を有効にする"}
      </button>
      {status === "denied" && (
        <div style={{ fontSize: 11, color: "var(--t-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          ブラウザの設定で通知がブロックされています。設定から許可してください。
        </div>
      )}
      {status === "unsupported" && (
        <div style={{ fontSize: 11, color: "var(--t-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          この端末・ブラウザは通知に未対応です（iOS はホーム画面に追加すると使えます）。
        </div>
      )}
      {status === "error" && (
        <div style={{ fontSize: 11, color: "var(--t-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          設定に失敗しました。時間をおいて再度お試しください。
        </div>
      )}
    </div>
  );
}
