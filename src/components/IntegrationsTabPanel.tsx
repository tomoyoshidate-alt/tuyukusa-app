"use client";

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { SupabaseSyncPanel } from "@/src/components/SupabaseSyncPanel";
import { ExternalIntegrationsPanel } from "@/src/components/ExternalIntegrationsPanel";
import type { NotionSettings } from "@/src/lib/notion";
import type { SupabaseSettings } from "@/src/lib/supabaseSync";

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

type Props = {
  /** Settings 埋め込み時は外側の余白・見出しを省略 */
  compact?: boolean;
  isDesktop: boolean;
  cardStyle: CSSProperties;
  fieldLabelStyle: CSSProperties;
  inputStyle: CSSProperties;
  supabaseSettings: SupabaseSettings;
  onSupabaseChange: (patch: Partial<SupabaseSettings>) => void;
  onSupabaseSynced: () => void;
  googleCalendar: GoogleCalendarProps;
  notionSettings: NotionSettings;
  notionSyncing: boolean;
  notionMessage: string;
  showNotionManual: boolean;
  onShowNotionManual: (show: boolean) => void;
  onNotionChange: (patch: Partial<NotionSettings>) => void;
  onNotionSetup: () => void;
  onNotionSync: () => void;
};

export function IntegrationsTabPanel({
  compact = false,
  isDesktop,
  cardStyle,
  fieldLabelStyle,
  inputStyle,
  supabaseSettings,
  onSupabaseChange,
  onSupabaseSynced,
  googleCalendar,
  notionSettings,
  notionSyncing,
  notionMessage,
  showNotionManual,
  onShowNotionManual,
  onNotionChange,
  onNotionSetup,
  onNotionSync,
}: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: compact ? 0 : isDesktop ? "8px 16px 24px" : 16 }}>
      {!compact && (
        <>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
            {t("tabs.integrations")}
          </div>
          <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 16, lineHeight: 1.5 }}>
            {t("integrations.hint")}
          </div>
        </>
      )}

      <SupabaseSyncPanel
        settings={supabaseSettings}
        onChange={onSupabaseChange}
        onSynced={onSupabaseSynced}
      />

      <ExternalIntegrationsPanel
        cardStyle={cardStyle}
        fieldLabelStyle={fieldLabelStyle}
        inputStyle={inputStyle}
        googleCalendar={googleCalendar}
        notion={{
          settings: notionSettings,
          syncing: notionSyncing,
          message: notionMessage,
          showManual: showNotionManual,
          onShowManual: onShowNotionManual,
          onSettingsChange: onNotionChange,
          onSetup: onNotionSetup,
          onSync: onNotionSync,
          onToggleEnabled: enabled =>
            onNotionChange({ enabled, connected: enabled ? notionSettings.connected : false }),
        }}
      />
    </div>
  );
}
