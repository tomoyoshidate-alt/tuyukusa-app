"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppLocale } from "@/src/lib/i18n/detectLocale";

type Props = {
  displayName: string;
  timeGreeting: string;
  environmentContext?: string;
  healthContext?: string;
  userKnowledgeContext?: string;
  healthSummary?: string;
  locale: AppLocale;
  onOpenChat: () => void;
};

type DailyMessage = {
  message: string;
  tag?: string;
};

export function AiDailyInsightSection({
  displayName,
  timeGreeting,
  environmentContext,
  healthContext,
  userKnowledgeContext,
  healthSummary,
  locale,
  onOpenChat,
}: Props) {
  const { t } = useTranslation();
  const [daily, setDaily] = useState<DailyMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        const res = await fetch("/api/daily-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            environmentContext,
            healthContext,
            userKnowledgeContext,
            locale,
          }),
        });
        if (!res.ok) throw new Error("daily message failed");
        const data = (await res.json()) as DailyMessage;
        if (!cancelled) setDaily(data);
      } catch {
        if (!cancelled) {
          setError(true);
          setDaily({
            tag: t("home.dailyMessageFallbackTag"),
            message: t("home.dailyMessageFallback"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayName, environmentContext, healthContext, userKnowledgeContext, locale, t]);

  return (
    <div
      style={{
        background: "var(--t-diagnosis-bg)",
        color: "var(--t-diagnosis-text)",
        padding: "28px 20px",
        marginTop: 16,
      }}
    >
      <div style={{ fontSize: "var(--t-font-size-base)", opacity: 0.6, marginBottom: 4 }}>
        {timeGreeting}
      </div>
      <div
        style={{
          fontSize: "var(--t-font-size-xl)",
          fontWeight: "bold",
          marginBottom: 16,
        }}
      >
        {displayName}
      </div>

      <div
        style={{
          display: "inline-block",
          background: "rgba(193,127,74,0.2)",
          border: "1px solid rgba(193,127,74,0.3)",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: "var(--t-font-size-base)",
          color: "var(--t-nav-active)",
          marginBottom: 16,
        }}
      >
        {t("home.dailyAiMessage")}
        {daily?.tag ? `：${daily.tag}` : loading ? "…" : ""}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          opacity: loading ? 0.5 : 0.85,
          borderLeft: "2px solid #c17f4a",
          paddingLeft: 12,
          minHeight: 48,
        }}
      >
        {loading ? t("home.dailyMessageLoading") : daily?.message ?? t("home.dailyMessageFallback")}
      </div>

      {healthSummary && (
        <div
          style={{
            fontSize: 11,
            marginTop: 12,
            padding: "8px 10px",
            background: "rgba(74,103,65,0.2)",
            borderRadius: 8,
            color: "#c5d8be",
          }}
        >
          ❤️ {healthSummary}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenChat}
        style={{
          marginTop: 18,
          width: "100%",
          padding: "14px 16px",
          borderRadius: 14,
          border: "none",
          background: "#1a1410",
          color: "#f5f0e8",
          fontSize: 15,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {t("home.openAiConsult")}
      </button>

      {error && (
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8, textAlign: "center" }}>
          {t("home.dailyMessageOffline")}
        </div>
      )}
    </div>
  );
}
