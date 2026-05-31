"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { SupabaseSetupWizard } from "@/src/components/SupabaseSetupWizard";
import { readIntegrationSkipFlags } from "@/src/lib/integrationSkipFlags";
import type { GoogleCalendarSettings } from "@/src/lib/googleCalendar";
import type { NotionSettings } from "@/src/lib/notion";
import { isSupabaseConfigured, type SupabaseSettings } from "@/src/lib/supabaseSync";

type Props = {
  supabaseSettings: SupabaseSettings;
  onSupabaseComplete: (url: string, anonKey: string, syncKey: string) => void;
  notionSettings: NotionSettings;
  googleCalendar: GoogleCalendarSettings;
  onOpenSettings: () => void;
  isHomeActive?: boolean;
};

function PromptCard({
  emoji,
  title,
  body,
  badge,
  onSetup,
  setupLabel,
  accentBorder,
}: {
  emoji: string;
  title: string;
  body: string;
  badge?: string;
  onSetup: () => void;
  setupLabel: string;
  accentBorder?: string;
}) {
  return (
    <div
      style={{
        margin: "12px 16px 0",
        background: "#fff",
        borderRadius: 14,
        padding: "16px",
        border: accentBorder ?? "1px solid rgba(60,40,20,0.1)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>
        {emoji} {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228", marginBottom: badge ? 10 : 12, whiteSpace: "pre-line" }}>
        {body}
      </div>
      {badge && (
        <div style={{ fontSize: 11, color: "#4a6741", fontWeight: "bold", marginBottom: 12 }}>{badge}</div>
      )}
      <button type="button" onClick={onSetup} style={setupBtnStyle}>
        {setupLabel}
      </button>
    </div>
  );
}

export function HomeIntegrationCards({
  supabaseSettings,
  onSupabaseComplete,
  notionSettings,
  googleCalendar,
  onOpenSettings,
  isHomeActive = true,
}: Props) {
  const { t } = useTranslation();
  const [skipFlags, setSkipFlags] = useState(readIntegrationSkipFlags);
  const [showSupabaseWizard, setShowSupabaseWizard] = useState(false);

  useEffect(() => {
    if (!isHomeActive) return;
    setSkipFlags(readIntegrationSkipFlags());
  }, [isHomeActive, supabaseSettings, notionSettings.connected, googleCalendar.connected]);

  const showSupabase = !skipFlags.supabase && !isSupabaseConfigured(supabaseSettings);
  const showNotion = !skipFlags.notion && !notionSettings.connected;
  const showGoogle = !skipFlags.googleCalendar && !googleCalendar.connected;

  if (!showSupabase && !showNotion && !showGoogle) return null;

  return (
    <>
      {showSupabase && (
        <PromptCard
          emoji="☁️"
          title={t("integrationGuide.cardSupabaseTitle")}
          body={t("integrationGuide.cardSupabaseBody")}
          badge={t("integrationGuide.recommended")}
          setupLabel={t("integrationGuide.setupNow")}
          accentBorder="1.5px solid rgba(126,200,227,0.45)"
          onSetup={() => setShowSupabaseWizard(true)}
        />
      )}

      {showNotion && (
        <PromptCard
          emoji="📓"
          title={t("integrationGuide.cardNotionTitle")}
          body={t("integrationGuide.cardNotionBody")}
          setupLabel={t("integrationGuide.setupNow")}
          onSetup={onOpenSettings}
        />
      )}

      {showGoogle && (
        <PromptCard
          emoji="📅"
          title={t("integrationGuide.cardGoogleTitle")}
          body={t("integrationGuide.cardGoogleBody")}
          setupLabel={t("integrationGuide.setupNow")}
          onSetup={onOpenSettings}
        />
      )}

      <SupabaseSetupWizard
        isOpen={showSupabaseWizard}
        onClose={() => setShowSupabaseWizard(false)}
        onComplete={onSupabaseComplete}
      />
    </>
  );
}

const setupBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
};
