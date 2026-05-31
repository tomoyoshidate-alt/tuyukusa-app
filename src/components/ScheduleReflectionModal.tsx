"use client";

import { useTranslation } from "react-i18next";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";

type Props = {
  reflection: ScheduleReflection | null;
  open: boolean;
  applying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ScheduleReflectionModal({ reflection, open, applying, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();

  if (!open || !reflection) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(26,20,16,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#f5f0e8",
          borderRadius: 20,
          padding: "20px 18px 24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 17, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>
          {t("reflectSchedule.confirmTitle")}
        </div>
        <div style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.6, marginBottom: 16 }}>
          {t("reflectSchedule.confirmBody")}
        </div>

        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 12 }}>
          {reflection.schedule.map((item, i) => (
            <div
              key={`${item.time}-${item.title}-${i}`}
              style={{
                background: "white",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 8,
                border: "1px solid rgba(60,40,20,0.1)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#1a1410" }}>{item.time}</div>
              <div style={{ fontSize: 13, color: "#3d3228", marginTop: 2 }}>{item.title}</div>
              {item.memo && (
                <div style={{ fontSize: 11, color: "#8b7355", marginTop: 4 }}>{item.memo}</div>
              )}
            </div>
          ))}
        </div>

        {reflection.habits && reflection.habits.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#4a6741", marginBottom: 6 }}>
              {t("reflectSchedule.habitsTitle")}
            </div>
            {reflection.habits.map((habit, i) => (
              <div key={`${habit.title}-${i}`} style={{ fontSize: 12, color: "#3d3228", marginBottom: 4 }}>
                {habit.title}
                {habit.time ? `（${habit.time}）` : ""}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "1.5px solid rgba(60,40,20,0.15)",
              background: "white",
              color: "#3d3228",
              fontSize: 14,
              cursor: applying ? "default" : "pointer",
            }}
          >
            {t("reflectSchedule.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={applying}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: applying ? "#8b7355" : "#1a1410",
              color: "#f5f0e8",
              fontSize: 14,
              fontWeight: "bold",
              cursor: applying ? "default" : "pointer",
            }}
          >
            {applying ? t("reflectSchedule.applying") : t("reflectSchedule.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
