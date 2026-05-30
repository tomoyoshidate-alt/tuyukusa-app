'use client';

import { useTranslation } from "react-i18next";
import { formatSyncTime } from "@/src/lib/notion";
import VoiceInputButton from "@/src/components/VoiceInputButton";

type Props = {
  connected: boolean;
  lastSyncAt?: number;
  syncing: boolean;
  onSync: () => void;
  onVoice: (text: string) => void;
};

export default function NotionHomeBar({ connected, lastSyncAt, syncing, onSync, onVoice }: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        margin: "12px 16px 0",
        background: "var(--t-card-bg)",
        borderRadius: "var(--t-radius-md)",
        padding: "12px 14px",
        border: "1px solid var(--t-notion-border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-text)" }}>🔗 {t("notion.title")}</div>
        <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginTop: 2 }}>
          {connected ? `${t("notion.lastSync")}: ${formatSyncTime(lastSyncAt)}` : t("notion.notConnected")}
        </div>
      </div>
      <VoiceInputButton onTranscript={onVoice} size="sm" disabled={syncing} />
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--t-radius-sm)",
          border: "none",
          background: "var(--t-primary)",
          color: "var(--t-text-inverse)",
          fontSize: "var(--t-font-size-sm)",
          fontWeight: "bold",
          cursor: syncing ? "wait" : "pointer",
          opacity: syncing ? 0.7 : 1,
          whiteSpace: "nowrap",
          fontFamily: "var(--t-font-family)",
        }}
      >
        {syncing ? t("common.syncing") : `🔄 ${t("common.sync")}`}
      </button>
    </div>
  );
}
