"use client";

import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import HealthKitBridge from "@/src/components/HealthKitBridge";
import { PwaInstallSection } from "@/src/components/PwaInstallSection";
import { SupabaseSetupWizard } from "@/src/components/SupabaseSetupWizard";
import {
  INTEGRATION_ORDER,
  type IntegrationChoice,
  type IntegrationId,
} from "@/src/lib/integrationGuide";
import type { SupabaseSettings } from "@/src/lib/supabaseSync";
import type { NotionSettings } from "@/src/lib/notion";
import type { GoogleCalendarSettings } from "@/src/lib/googleCalendar";
import type { HealthData } from "@/src/lib/healthData";

export type IntegrationFinishOptions = {
  openTab?: "home" | "settings" | "sound" | "display";
  allDeferred: boolean;
};

type Props = {
  supabaseSettings: SupabaseSettings;
  onSupabaseChange: (patch: Partial<SupabaseSettings>) => void;
  notionSettings: NotionSettings;
  onNotionChange: (patch: Partial<NotionSettings>) => void;
  onNotionSetup: () => Promise<boolean>;
  googleCalendar: GoogleCalendarSettings;
  onGoogleCalendarChange: (patch: Partial<GoogleCalendarSettings>) => void;
  onGoogleConnect: () => Promise<void>;
  healthData: HealthData;
  onFinish: (options: IntegrationFinishOptions) => void;
};

const CARD_KEYS: Record<
  IntegrationId,
  { title: string; body: string; duration: string; badge?: string; pcNote?: string }
> = {
  supabase: {
    title: "integrationGuide.cardSupabaseTitle",
    body: "integrationGuide.cardSupabaseBody",
    duration: "integrationGuide.durationSupabase",
    badge: "integrationGuide.recommended",
  },
  notion: {
    title: "integrationGuide.cardNotionTitle",
    body: "integrationGuide.cardNotionBody",
    duration: "integrationGuide.durationNotion",
  },
  googleCalendar: {
    title: "integrationGuide.cardGoogleTitle",
    body: "integrationGuide.cardGoogleBody",
    duration: "integrationGuide.durationGoogle",
  },
  healthkit: {
    title: "integrationGuide.cardHealthTitle",
    body: "integrationGuide.cardHealthBody",
    duration: "integrationGuide.durationHealth",
    pcNote: "integrationGuide.healthPcNote",
  },
  sound: {
    title: "integrationGuide.cardSoundTitle",
    body: "integrationGuide.cardSoundBody",
    duration: "integrationGuide.durationSound",
  },
};

export function OnboardingIntegrationsScreen({
  supabaseSettings,
  onSupabaseChange,
  notionSettings,
  onNotionChange,
  onNotionSetup,
  googleCalendar,
  onGoogleCalendarChange,
  onGoogleConnect,
  healthData,
  onFinish,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"intro" | "cards" | "reminder">("intro");
  const [cardIndex, setCardIndex] = useState(0);
  const [choices, setChoices] = useState<Partial<Record<IntegrationId, IntegrationChoice>>>({});
  const [activeSetup, setActiveSetup] = useState<IntegrationId | null>(null);
  const [showSupabaseWizard, setShowSupabaseWizard] = useState(false);
  const [notionBusy, setNotionBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [notionMessage, setNotionMessage] = useState("");

  const currentId = INTEGRATION_ORDER[cardIndex];
  const cardMeta = currentId ? CARD_KEYS[currentId] : null;

  const recordChoice = (id: IntegrationId, choice: IntegrationChoice) => {
    setChoices(prev => ({ ...prev, [id]: choice }));
  };

  const advanceOrFinish = (nextChoices: Partial<Record<IntegrationId, IntegrationChoice>>) => {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= INTEGRATION_ORDER.length) {
      const allLater = INTEGRATION_ORDER.every(id => nextChoices[id] === "later");
      if (allLater) {
        setPhase("reminder");
      } else {
        onFinish({ allDeferred: false, openTab: "home" });
      }
      return;
    }
    setCardIndex(nextIndex);
    setActiveSetup(null);
  };

  const handleLater = () => {
    if (!currentId) return;
    recordChoice(currentId, "later");
    advanceOrFinish({ ...choices, [currentId]: "later" });
  };

  const handleSetupNow = () => {
    if (!currentId) return;
    if (currentId === "supabase") {
      setShowSupabaseWizard(true);
      return;
    }
    if (currentId === "sound") {
      recordChoice(currentId, "setup");
      advanceOrFinish({ ...choices, [currentId]: "setup" });
      return;
    }
    setActiveSetup(currentId);
  };

  const completeSetup = (id: IntegrationId) => {
    recordChoice(id, "setup");
    advanceOrFinish({ ...choices, [id]: "setup" });
  };

  const handleNotionSetup = async () => {
    setNotionBusy(true);
    setNotionMessage("");
    try {
      const ok = await onNotionSetup();
      if (!ok) throw new Error(t("notion.syncFailed"));
      setNotionMessage(t("integrationGuide.notionConnected"));
      setTimeout(() => completeSetup("notion"), 600);
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : t("notion.syncFailed"));
    } finally {
      setNotionBusy(false);
    }
  };

  const handleGoogleSetup = async () => {
    setGoogleBusy(true);
    try {
      await onGoogleConnect();
      completeSetup("googleCalendar");
    } finally {
      setGoogleBusy(false);
    }
  };

  const cardEmoji: Record<IntegrationId, string> = {
    supabase: "",
    notion: "",
    googleCalendar: "",
    healthkit: "",
    sound: "",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "#f5f0e8",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "16px 20px 12px", background: "#1a1410", color: "#f5f0e8" }}>
        <div style={{ fontSize: 18, fontWeight: "bold" }}>{t("integrationGuide.title")}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{t("integrationGuide.subtitle")}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {phase === "intro" && (
          <div>
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "18px 16px",
                fontSize: 14,
                lineHeight: 1.85,
                color: "#3d3228",
                whiteSpace: "pre-line",
                marginBottom: 20,
                border: "1px solid rgba(60,40,20,0.08)",
              }}
            >
              {t("integrationGuide.introMessage")}
            </div>
            <button
              type="button"
              onClick={() => setPhase("cards")}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: "#1a1410",
                color: "#f5f0e8",
                fontSize: 15,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {t("integrationGuide.startCards")}
            </button>
          </div>
        )}

        {phase === "cards" && cardMeta && currentId && !activeSetup && (
          <div>
            <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 8 }}>
              {cardIndex + 1} / {INTEGRATION_ORDER.length}
            </div>
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "20px 16px",
                border: currentId === "supabase" ? "2px solid #7ec8e3" : "1px solid rgba(60,40,20,0.1)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>
                {cardEmoji[currentId]} {t(cardMeta.title)}
              </div>
              {cardMeta.badge && (
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: "bold",
                    color: "#4a6741",
                    background: "#e8f0e4",
                    borderRadius: 8,
                    padding: "4px 10px",
                    marginBottom: 10,
                  }}
                >
                  {t(cardMeta.badge)}
                </div>
              )}
              <div style={{ fontSize: 14, lineHeight: 1.75, color: "#3d3228", marginBottom: 12, whiteSpace: "pre-line" }}>
                {t(cardMeta.body)}
              </div>
              <div style={{ fontSize: 11, color: "#8b7355", marginBottom: 8 }}>{t(cardMeta.duration)}</div>
              {cardMeta.pcNote && (
                <div style={{ fontSize: 11, color: "#c17f4a", marginBottom: 12 }}>※ {t(cardMeta.pcNote)}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSetupNow}
                  style={{
                    padding: "13px",
                    borderRadius: 12,
                    border: "none",
                    background: "#1a1410",
                    color: "#f5f0e8",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {t("integrationGuide.setupNow")}
                </button>
                <button
                  type="button"
                  onClick={handleLater}
                  style={{
                    padding: "13px",
                    borderRadius: 12,
                    border: "1.5px solid rgba(60,40,20,0.15)",
                    background: "white",
                    color: "#3d3228",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t("integrationGuide.setupLater")}
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "cards" && activeSetup === "notion" && (
          <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid rgba(126,200,227,0.35)" }}>
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>{t("notion.settingsTitle")}</div>
            <div style={{ fontSize: 12, color: "#3d3228", marginBottom: 10, lineHeight: 1.6 }}>
              {t("notion.settingsDescription")}
            </div>
            <input
              type="password"
              placeholder={t("notion.apiKeyPlaceholder")}
              value={notionSettings.apiKey}
              onChange={e => onNotionChange({ apiKey: e.target.value, connected: false, enabled: true })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(60,40,20,0.12)",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              disabled={notionBusy}
              onClick={() => void handleNotionSetup()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: "#4a6741",
                color: "#f5f0e8",
                fontSize: 14,
                fontWeight: "bold",
                cursor: notionBusy ? "default" : "pointer",
                marginBottom: 8,
              }}
            >
              {notionBusy ? t("common.syncing") : t("notion.autoSetup")}
            </button>
            <button type="button" onClick={handleLater} style={secondaryBtnStyle}>
              {t("integrationGuide.setupLater")}
            </button>
            {notionMessage && (
              <div style={{ fontSize: 11, color: "#4a6741", marginTop: 8 }}>{notionMessage}</div>
            )}
          </div>
        )}

        {phase === "cards" && activeSetup === "googleCalendar" && (
          <div style={{ background: "white", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>{t("settings.calendarTitle")}</div>
            <input
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/..."
              value={googleCalendar.icalUrl}
              onChange={e => onGoogleCalendarChange({ icalUrl: e.target.value, connected: false })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(60,40,20,0.12)",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              disabled={googleBusy || !googleCalendar.icalUrl.trim()}
              onClick={() => void handleGoogleSetup()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: "#1a1410",
                color: "#f5f0e8",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              {googleBusy ? t("common.syncing") : t("integrations.connect")}
            </button>
            <button type="button" onClick={handleLater} style={secondaryBtnStyle}>
              {t("integrationGuide.setupLater")}
            </button>
          </div>
        )}

        {phase === "cards" && activeSetup === "healthkit" && (
          <div>
            <HealthKitBridge healthData={healthData} compact />
            <button
              type="button"
              onClick={() => completeSetup("healthkit")}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: "#4a6741",
                color: "#f5f0e8",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {t("integrationGuide.healthDone")}
            </button>
            <button type="button" onClick={handleLater} style={{ ...secondaryBtnStyle, marginTop: 8 }}>
              {t("integrationGuide.setupLater")}
            </button>
          </div>
        )}

        {phase === "reminder" && (
          <div>
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: "18px 16px",
                fontSize: 14,
                lineHeight: 1.85,
                color: "#3d3228",
                whiteSpace: "pre-line",
                marginBottom: 16,
                border: "1px solid rgba(60,40,20,0.08)",
              }}
            >
              {t("integrationGuide.reminderMessage")}
            </div>
            <PwaInstallSection variant="onboarding" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowSupabaseWizard(true)}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: "#4a6741",
                  color: "#f5f0e8",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {t("integrationGuide.setupSupabaseNow")}
              </button>
              <button
                type="button"
                onClick={() => onFinish({ allDeferred: true, openTab: "home" })}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(60,40,20,0.15)",
                  background: "white",
                  color: "#3d3228",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {t("integrationGuide.goHomeLater")}
              </button>
            </div>
          </div>
        )}
      </div>

      <SupabaseSetupWizard
        isOpen={showSupabaseWizard}
        onClose={() => setShowSupabaseWizard(false)}
        onComplete={(url, anonKey, syncKey) => {
          onSupabaseChange({ url, anonKey, syncId: syncKey, enabled: true });
          if (phase === "reminder") {
            onFinish({ allDeferred: true, openTab: "home" });
          } else if (currentId === "supabase") {
            completeSetup("supabase");
          }
        }}
      />
    </div>
  );
}

const secondaryBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 12,
  border: "1.5px solid rgba(60,40,20,0.15)",
  background: "white",
  color: "#3d3228",
  fontSize: 14,
  cursor: "pointer",
};
