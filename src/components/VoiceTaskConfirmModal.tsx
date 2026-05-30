'use client';

import type { ParsedVoiceTask } from "@/src/lib/notion";
import { mapNotionTypeLabel } from "@/src/lib/notion";

type Props = {
  task: ParsedVoiceTask;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function VoiceTaskConfirmModal({ task, loading = false, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(26,20,16,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#f5f0e8",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 28px",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 8 }}>
          🎤 タスクを登録しますか？
        </div>
        <div style={{ fontSize: 12, color: "#9a8b7a", marginBottom: 16, lineHeight: 1.6 }}>
          {task.summary}
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid rgba(60,40,20,0.1)" }}>
          <Row label="タスク名" value={task.text} />
          <Row label="種別" value={mapNotionTypeLabel(task.type)} />
          <Row label="カテゴリ" value={task.category} />
          {task.deadline && <Row label="期限" value={task.deadline} />}
          {task.time && <Row label="時間" value={task.time} />}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#9a8b7a",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "#4a6741",
              color: "white",
              fontWeight: "bold",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "登録中…" : "Notionに登録"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, fontSize: 13 }}>
      <span style={{ color: "#9a8b7a" }}>{label}</span>
      <span style={{ color: "#3d3228", fontWeight: "bold", textAlign: "right" }}>{value}</span>
    </div>
  );
}
