'use client';

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
  return (
    <div
      style={{
        margin: "12px 16px 0",
        background: "white",
        borderRadius: 12,
        padding: "12px 14px",
        border: "1px solid rgba(126,200,227,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: "bold", color: "#3d3228" }}>🔗 Notionタスク</div>
        <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 2 }}>
          {connected ? `最終同期: ${formatSyncTime(lastSyncAt)}` : "未連携 · 設定から接続"}
        </div>
      </div>
      <VoiceInputButton onTranscript={onVoice} size="sm" disabled={syncing} />
      <button
        type="button"
        onClick={onSync}
        disabled={syncing}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "none",
          background: "#4a6741",
          color: "white",
          fontSize: 11,
          fontWeight: "bold",
          cursor: syncing ? "wait" : "pointer",
          opacity: syncing ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {syncing ? "同期中…" : "🔄 同期"}
      </button>
    </div>
  );
}
