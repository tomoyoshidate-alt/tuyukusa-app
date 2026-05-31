"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSupabaseConfigured,
  syncWithSupabase,
  SUPABASE_SETUP_SQL,
  type SupabaseSettings,
} from "@/src/lib/supabaseSync";

type Props = {
  settings: SupabaseSettings;
  onChange: (patch: Partial<SupabaseSettings>) => void;
  onSynced: () => void;
};

export function SupabaseSyncPanel({ settings, onChange, onSynced }: Props) {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [showSql, setShowSql] = useState(false);

  const configured = isSupabaseConfigured(settings);

  const runSync = async (direction: "push" | "pull" | "merge") => {
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncWithSupabase(settings, direction);
      onChange({ lastSyncAt: Date.now(), lastError: undefined, enabled: true });
      if (result.pulled) onSynced();
      const parts: string[] = [];
      if (result.pushed) parts.push(t("supabase.pushed"));
      if (result.pulled) parts.push(t("supabase.pulled"));
      setMessage(parts.join(" · ") || t("supabase.syncDone"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("supabase.syncFailed");
      onChange({ lastError: msg });
      setMessage(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
        {t("supabase.title")}
      </div>
      <div
        style={{
          background: "#eef4fb",
          borderRadius: 12,
          padding: 14,
          border: "1px solid rgba(126,200,227,0.35)",
        }}
      >
        <div style={{ fontSize: 12, color: "#3d3228", lineHeight: 1.7, marginBottom: 10 }}>
          {t("supabase.description")}
        </div>

        <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          {t("supabase.urlLabel")}
        </div>
        <input
          type="url"
          placeholder="https://xxxx.supabase.co"
          value={settings.url}
          onChange={e => onChange({ url: e.target.value, enabled: false })}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(60,40,20,0.12)",
            fontSize: 12,
            marginBottom: 8,
            boxSizing: "border-box",
          }}
        />

        <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          {t("supabase.anonKeyLabel")}
        </div>
        <input
          type="password"
          placeholder="eyJ..."
          value={settings.anonKey}
          onChange={e => onChange({ anonKey: e.target.value, enabled: false })}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(60,40,20,0.12)",
            fontSize: 12,
            marginBottom: 8,
            boxSizing: "border-box",
          }}
        />

        <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          {t("supabase.syncIdLabel")}
        </div>
        <input
          type="text"
          placeholder={t("supabase.syncIdPlaceholder")}
          value={settings.syncId}
          onChange={e => onChange({ syncId: e.target.value, enabled: false })}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(60,40,20,0.12)",
            fontSize: 12,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          onClick={() => setShowSql(v => !v)}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(126,200,227,0.5)",
            background: "white",
            color: "#4a6741",
            fontSize: 11,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {showSql ? "▼" : "▶"} {t("supabase.setupSql")}
        </button>
        {showSql && (
          <pre
            style={{
              fontSize: 9,
              background: "#1a1410",
              color: "#c5d8be",
              padding: 10,
              borderRadius: 8,
              overflowX: "auto",
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            {SUPABASE_SETUP_SQL}
          </pre>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={!configured || syncing}
            onClick={() => void runSync("merge")}
            style={{
              flex: 1,
              minWidth: 100,
              padding: "9px 10px",
              borderRadius: 10,
              border: "none",
              background: configured ? "#4a6741" : "#9a8b7a",
              color: "#f5f0e8",
              fontSize: 12,
              fontWeight: "bold",
              cursor: configured && !syncing ? "pointer" : "default",
            }}
          >
            {syncing ? t("common.syncing") : t("supabase.syncNow")}
          </button>
          <button
            type="button"
            disabled={!configured || syncing}
            onClick={() => void runSync("push")}
            style={{
              padding: "9px 10px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#3d3228",
              fontSize: 12,
              cursor: configured && !syncing ? "pointer" : "default",
            }}
          >
            送信
          </button>
          <button
            type="button"
            disabled={!configured || syncing}
            onClick={() => void runSync("pull")}
            style={{
              padding: "9px 10px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#3d3228",
              fontSize: 12,
              cursor: configured && !syncing ? "pointer" : "default",
            }}
          >
            ↓
          </button>
        </div>

        {settings.lastSyncAt && (
          <div style={{ fontSize: 10, color: "#4a6741", marginTop: 8 }}>
            {t("supabase.lastSync")}:{" "}
            {new Date(settings.lastSyncAt).toLocaleString()}
          </div>
        )}
        {message && (
          <div
            style={{
              fontSize: 11,
              color: message.includes("失敗") || settings.lastError ? "#c44a4a" : "#4a6741",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
