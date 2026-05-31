"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SupabaseSetupWizard } from "@/src/components/SupabaseSetupWizard";
import {
  isSupabaseConfigured,
  syncWithSupabase,
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
  const [showSupabaseWizard, setShowSupabaseWizard] = useState(false);

  const configured = isSupabaseConfigured(settings);

  const runSync = async (direction: "push" | "pull" | "merge", nextSettings = settings) => {
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncWithSupabase(nextSettings, direction);
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

  const handleWizardComplete = (url: string, anonKey: string, syncKey: string) => {
    const next: SupabaseSettings = {
      ...settings,
      url,
      anonKey,
      syncId: syncKey,
      enabled: true,
    };
    onChange({ url, anonKey, syncId: syncKey, enabled: true });
    void runSync("merge", next);
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
        <div style={{ fontSize: 12, color: "#3d3228", lineHeight: 1.7, marginBottom: 12 }}>
          {t("supabase.description")}
        </div>

        <button
          type="button"
          onClick={() => setShowSupabaseWizard(true)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: configured ? 12 : 0,
          }}
        >
          {t("integrationGuide.setupNow")}
        </button>

        {configured && (
          <>
            <div style={{ fontSize: 11, color: "#4a6741", marginBottom: 10, lineHeight: 1.5 }}>
              {t("supabase.configuredHint")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void runSync("merge")}
                style={{
                  flex: 1,
                  minWidth: 100,
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "none",
                  background: "#4a6741",
                  color: "#f5f0e8",
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: syncing ? "default" : "pointer",
                }}
              >
                {syncing ? t("common.syncing") : t("supabase.syncNow")}
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void runSync("push")}
                style={{
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(60,40,20,0.12)",
                  background: "white",
                  color: "#3d3228",
                  fontSize: 12,
                  cursor: syncing ? "default" : "pointer",
                }}
              >
                送信
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void runSync("pull")}
                style={{
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(60,40,20,0.12)",
                  background: "white",
                  color: "#3d3228",
                  fontSize: 12,
                  cursor: syncing ? "default" : "pointer",
                }}
              >
                ↓
              </button>
            </div>
          </>
        )}

        {settings.lastSyncAt && (
          <div style={{ fontSize: 10, color: "#4a6741", marginTop: 8 }}>
            {t("supabase.lastSync")}: {new Date(settings.lastSyncAt).toLocaleString()}
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

      <SupabaseSetupWizard
        isOpen={showSupabaseWizard}
        onClose={() => setShowSupabaseWizard(false)}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}
