"use client";

import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/components/ThemeProvider";
import type { ThemeMode } from "@/src/lib/theme/types";
import { themeCardStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

const MODE_LABEL_KEYS: Record<ThemeMode, string> = {
  natural: "themeMode.natural",
  time: "themeMode.time",
  light: "themeMode.light",
  dark: "themeMode.dark",
};

export default function ThemeSettingsPanel() {
  const { t } = useTranslation();
  const { settings, setThemeMode, themeModes } = useTheme();

  return (
    <>
      <div style={themeSectionTitleStyle}>{t("themeMode.title")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 10, lineHeight: 1.5 }}>{t("themeMode.description")}</div>
      <div style={{ ...themeCardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        {themeModes.map(mode => {
          const selected = settings.themeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              style={{
                padding: "12px 14px",
                borderRadius: "var(--t-radius-sm)",
                border: selected ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
                background: selected ? "var(--t-accent-bg)" : "var(--t-card-bg)",
                color: "var(--t-text)",
                fontSize: "var(--t-font-size-base)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--t-font-family)",
                fontWeight: selected ? "bold" : "normal",
              }}
            >
              {t(MODE_LABEL_KEYS[mode])}
            </button>
          );
        })}
      </div>
    </>
  );
}
