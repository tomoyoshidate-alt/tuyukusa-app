"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildClientBriefingContext, getClientModuleId } from "@/src/lib/briefing/clientContext";
import {
  getDayKey,
  isBriefingValidForToday,
  loadDailyBriefing,
  saveDailyBriefing,
} from "@/src/lib/briefing/storage";

type Props = {
  moduleId: string;
  displayName?: string;
  active?: boolean;
};

export function MorningBriefingCard({ moduleId, displayName, active = true }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchRef = useRef(0);

  const fetchBriefing = useCallback(
    async (force = false) => {
      const dayKey = getDayKey();
      const cached = loadDailyBriefing();

      if (!force && isBriefingValidForToday(cached, moduleId, dayKey)) {
        setText(cached!.text);
        setError("");
        return;
      }

      const requestId = ++fetchRef.current;
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            force,
            dayKey,
            cached: cached ?? undefined,
            context: buildClientBriefingContext(displayName),
          }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Briefing request failed");
        }

        const data = (await res.json()) as {
          text: string;
          dayKey: string;
          moduleId: string;
          generatedAt: string;
        };

        if (requestId !== fetchRef.current) return;

        setText(data.text);
        saveDailyBriefing({
          dayKey: data.dayKey,
          moduleId: data.moduleId,
          text: data.text,
          generatedAt: data.generatedAt,
        });
      } catch (err) {
        if (requestId !== fetchRef.current) return;
        setError(err instanceof Error ? err.message : t("briefing.error"));
      } finally {
        if (requestId === fetchRef.current) setLoading(false);
      }
    },
    [moduleId, displayName, t]
  );

  useEffect(() => {
    if (!active) return;
    const dayKey = getDayKey();
    const cached = loadDailyBriefing();
    if (isBriefingValidForToday(cached, moduleId, dayKey)) {
      setText(cached!.text);
      return;
    }
    void fetchBriefing(false);
  }, [active, moduleId, fetchBriefing]);

  if (!active) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8f4ec 0%, #eef4ea 100%)",
        border: "1px solid rgba(107,143,98,0.25)",
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: "#6b8f62",
          marginBottom: 8,
          letterSpacing: "0.04em",
        }}
      >
        {t("briefing.label")}
      </div>

      {loading && !text && (
        <div style={{ fontSize: 12, color: "#9a8b7a", lineHeight: 1.7 }}>{t("briefing.loading")}</div>
      )}

      {error && !text && (
        <div style={{ fontSize: 12, color: "#c44a4a", lineHeight: 1.6 }}>{error}</div>
      )}

      {text && (
        <div style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{text}</div>
      )}

      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => void fetchBriefing(true)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: 11,
            color: "#6b8f62",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
            fontFamily: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          {loading ? t("briefing.regenerating") : t("briefing.regenerate")}
        </button>
      </div>
    </div>
  );
}
