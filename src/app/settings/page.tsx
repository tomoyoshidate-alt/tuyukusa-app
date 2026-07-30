"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  themeAppShellStyle,
  themeBackLinkStyle,
  themeCardStyle,
  themeHeaderStyle,
  themeMutedTextStyle,
  themeSectionTitleStyle,
} from "@/src/lib/themeStyles";
import { LocationSettingsPanel } from "@/src/components/LocationSettingsPanel";
import { PushNotificationToggle } from "@/src/components/PushNotificationToggle";
import QuickLaunchGuide from "@/src/components/QuickLaunchGuide";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div style={themeAppShellStyle}>
      <header style={themeHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={themeBackLinkStyle} aria-label={t("common.close")}>
            ←
          </Link>
          <div>
            <div style={{ fontSize: "var(--t-font-size-xl)", fontWeight: "bold" }}>{t("tabs.settings")}</div>
            <div style={{ fontSize: "var(--t-font-size-sm)", opacity: 0.75, marginTop: 2 }}>{t("common.appSubtitle")}</div>
          </div>
        </div>
      </header>

      <main style={{ padding: 16, flex: 1 }}>
        <div style={{ ...themeMutedTextStyle, marginBottom: 16, lineHeight: 1.6 }}>
          {t("settings.aiModuleIndexHint")}
        </div>

        <Link href="/settings/ai-module" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              ...themeCardStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)", marginBottom: 4 }}>
                {t("settings.aiModuleLinkTitle")}
              </div>
              <div style={{ fontSize: 12, color: "var(--t-text-muted)", lineHeight: 1.5 }}>
                {t("settings.aiModuleLinkBody")}
              </div>
            </div>
            <span style={{ fontSize: 18, opacity: 0.4, flexShrink: 0, marginLeft: 8 }}>›</span>
          </div>
        </Link>

        <Link href="/settings/memories" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            style={{
              ...themeCardStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)", marginBottom: 4 }}>
                {t("settings.memoriesLinkTitle")}
              </div>
              <div style={{ fontSize: 12, color: "var(--t-text-muted)", lineHeight: 1.5 }}>
                {t("settings.memoriesLinkBody")}
              </div>
            </div>
            <span style={{ fontSize: 18, opacity: 0.4, flexShrink: 0, marginLeft: 8 }}>›</span>
          </div>
        </Link>

        <PushNotificationToggle />
        <div style={themeSectionTitleStyle}>{t("settings.locationSectionTitle")}</div>
        <LocationSettingsPanel />
        <div style={themeSectionTitleStyle}>すぐ起動（背面ダブルタップ・音声タスク追加）</div>
        <div style={themeCardStyle}>
          <QuickLaunchGuide />
        </div>
      </main>
    </div>
  );
}
