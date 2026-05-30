"use client";

import { useTranslation } from "react-i18next";
import { changeAppLanguage } from "@/src/components/AppProviders";
import { APP_LOCALES, LOCALE_LABEL_KEYS, type AppLocale } from "@/src/lib/i18n/detectLocale";
import { themeCardStyle, themeSectionTitleStyle, themeMutedTextStyle } from "@/src/lib/themeStyles";

export default function LanguageSettingsPanel() {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "ja") as AppLocale;

  return (
    <>
      <div style={themeSectionTitleStyle}>🌐 {t("language.title")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 10, lineHeight: 1.5 }}>{t("language.description")}</div>
      <div style={{ ...themeCardStyle, display: "flex", flexDirection: "column", gap: 6 }}>
        {APP_LOCALES.map(locale => (
          <button
            key={locale}
            type="button"
            onClick={() => changeAppLanguage(locale)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: "var(--t-radius-sm)",
              border: current === locale ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
              background: current === locale ? "var(--t-accent-bg)" : "var(--t-card-bg)",
              color: "var(--t-text)",
              fontSize: "var(--t-font-size-base)",
              cursor: "pointer",
              fontFamily: "var(--t-font-family)",
            }}
          >
            <span>{t(LOCALE_LABEL_KEYS[locale])}</span>
            {current === locale && <span style={{ color: "var(--t-primary)" }}>✓</span>}
          </button>
        ))}
      </div>
    </>
  );
}
