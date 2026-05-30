"use client";

import { useTranslation } from "react-i18next";
import type { NotionSettings } from "@/src/lib/notion";
import NotionManualPage from "@/src/components/NotionManualPage";

type GoogleCalendarProps = {
  connected: boolean;
  icalUrl: string;
  syncing: boolean;
  message: string;
  onIcalUrlChange: (url: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
};

type NotionProps = {
  settings: NotionSettings;
  syncing: boolean;
  message: string;
  showManual: boolean;
  onShowManual: (show: boolean) => void;
  onSettingsChange: (patch: Partial<NotionSettings>) => void;
  onSetup: () => void;
  onSync: () => void;
  onToggleEnabled: (enabled: boolean) => void;
};

type Props = {
  googleCalendar: GoogleCalendarProps;
  notion: NotionProps;
  cardStyle: React.CSSProperties;
  fieldLabelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
};

export function ExternalIntegrationsPanel({
  googleCalendar,
  notion,
  cardStyle,
  fieldLabelStyle,
  inputStyle,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <div
        style={{
          fontSize: 15,
          fontWeight: "bold",
          color: "#3d3228",
          marginBottom: 4,
          paddingTop: 12,
          borderTop: "1px solid rgba(60,40,20,0.12)",
          marginTop: 8,
        }}
      >
        🔗 {t("integrations.title")}
      </div>
      <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
        {t("integrations.hint")}
      </div>

      {/* Google Calendar */}
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#3d3228", marginBottom: 8 }}>
          📅 {t("settings.calendarTitle")}
        </div>
        <div style={fieldLabelStyle}>iCal URL（非公開）</div>
        <input
          type="url"
          placeholder="https://calendar.google.com/calendar/ical/..."
          value={googleCalendar.icalUrl}
          onChange={e => googleCalendar.onIcalUrlChange(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={googleCalendar.onConnect}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: "#4a6741",
              color: "#f5f0e8",
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {googleCalendar.connected ? t("integrations.reconnect") : t("integrations.connect")}
          </button>
          {googleCalendar.connected && (
            <>
              <button
                type="button"
                onClick={googleCalendar.onSync}
                disabled={googleCalendar.syncing}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(60,40,20,0.12)",
                  background: "white",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {googleCalendar.syncing ? t("common.syncing") : t("common.sync")}
              </button>
              <button
                type="button"
                onClick={googleCalendar.onDisconnect}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(196,74,74,0.3)",
                  background: "white",
                  color: "#c44a4a",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t("integrations.disconnect")}
              </button>
            </>
          )}
        </div>
        {googleCalendar.message && (
          <div
            style={{
              fontSize: 11,
              color:
                googleCalendar.message.includes("失敗") || googleCalendar.message.includes("できません")
                  ? "#c44a4a"
                  : "#4a6741",
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            {googleCalendar.message}
          </div>
        )}
      </div>

      {/* Notion */}
      <div style={{ ...cardStyle, marginBottom: 12, background: "#eef4fb", border: "1px solid rgba(126,200,227,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#3d3228" }}>{t("notion.settingsTitle")}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#3d3228", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={notion.settings.enabled}
              onChange={e => notion.onToggleEnabled(e.target.checked)}
              style={{ accentColor: "#4a6741" }}
            />
            {t("integrations.enable")}
          </label>
        </div>
        <div style={{ fontSize: 12, color: "#3d3228", lineHeight: 1.7, marginBottom: 10 }}>
          {t("notion.settingsDescription")}
        </div>
        <button
          type="button"
          onClick={() => notion.onShowManual(true)}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(126,200,227,0.5)",
            background: "white",
            color: "#4a6741",
            fontSize: 12,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {t("notion.manualLink")}
        </button>
        <div style={fieldLabelStyle}>{t("notion.apiKeyLabel")}</div>
        <input
          type="password"
          placeholder={t("notion.apiKeyPlaceholder")}
          value={notion.settings.apiKey}
          onChange={e =>
            notion.onSettingsChange({ apiKey: e.target.value, connected: false, enabled: notion.settings.enabled })
          }
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        {notion.settings.taskDatabaseId && (
          <div style={{ fontSize: 10, color: "#9a8b7a", marginBottom: 10, lineHeight: 1.6 }}>
            {t("notion.dbIds")}: {notion.settings.taskDatabaseId.slice(0, 8)}…
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={notion.onSetup}
            disabled={!notion.settings.enabled}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: notion.settings.enabled ? "#4a6741" : "#9a8b7a",
              color: "#f5f0e8",
              fontSize: 13,
              fontWeight: "bold",
              cursor: notion.settings.enabled ? "pointer" : "default",
            }}
          >
            {notion.settings.connected ? t("notion.reconnect") : t("notion.autoSetup")}
          </button>
          <button
            type="button"
            onClick={notion.onSync}
            disabled={!notion.settings.connected || !notion.settings.enabled}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#9a8b7a",
              fontSize: 13,
              cursor: notion.settings.connected && notion.settings.enabled ? "pointer" : "default",
              opacity: notion.settings.connected && notion.settings.enabled ? 1 : 0.5,
            }}
          >
            {notion.syncing ? t("common.syncing") : t("common.sync")}
          </button>
        </div>
        {notion.settings.connected && notion.settings.enabled && (
          <div style={{ fontSize: 11, color: "#4a6741", marginTop: 10 }}>
            ✓ {t("notion.connected")}
            {notion.settings.lastSyncAt
              ? ` · ${t("notion.lastAt")} ${new Date(notion.settings.lastSyncAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </div>
        )}
        {notion.message && (
          <div
            style={{
              fontSize: 11,
              color: notion.message.includes("失敗") ? "#c44a4a" : "#4a6741",
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            {notion.message}
          </div>
        )}
      </div>

      {notion.showManual && <NotionManualPage onClose={() => notion.onShowManual(false)} />}
    </>
  );
}
