"use client";

import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/components/ThemeProvider";
import { THEME_IDS } from "@/src/lib/theme/types";
import { themeCardStyle, themeInputStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

export default function ThemeSettingsPanel() {
  const { t } = useTranslation();
  const { settings, setThemeId, setBaseColor, setUseCustomBaseColor, presets } = useTheme();

  return (
    <>
      <div style={themeSectionTitleStyle}>{t("theme.title")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 10, lineHeight: 1.5 }}>{t("theme.description")}</div>
      <div style={{ ...themeCardStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {THEME_IDS.map(id => {
          const preset = presets[id];
          const selected = settings.themeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setThemeId(id)}
              style={{
                padding: "10px 8px",
                borderRadius: "var(--t-radius-sm)",
                border: selected ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
                background: selected ? "var(--t-accent-bg)" : "var(--t-card-bg)",
                color: "var(--t-text)",
                fontSize: "var(--t-font-size-sm)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--t-font-family)",
              }}
            >
              {preset.emoji ? <span style={{ marginRight: 4 }}>{preset.emoji}</span> : null}
              {t(preset.nameKey)}
            </button>
          );
        })}
      </div>

      <div style={{ ...themeCardStyle, marginTop: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.useCustomBaseColor}
            onChange={e => setUseCustomBaseColor(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "var(--t-checkbox-accent)" }}
          />
          <span style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-text)" }}>{t("theme.useCustomColor")}</span>
        </label>
        <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 8 }}>
          {t("theme.baseColor")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="color"
            value={settings.baseColor}
            onChange={e => setBaseColor(e.target.value)}
            disabled={!settings.useCustomBaseColor}
            style={{ width: 48, height: 36, border: "none", background: "none", cursor: settings.useCustomBaseColor ? "pointer" : "default", opacity: settings.useCustomBaseColor ? 1 : 0.5 }}
          />
          <input
            type="text"
            value={settings.baseColor}
            onChange={e => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBaseColor(e.target.value);
            }}
            disabled={!settings.useCustomBaseColor}
            style={{ ...themeInputStyle, flex: 1, opacity: settings.useCustomBaseColor ? 1 : 0.5 }}
          />
        </div>
        <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          {t("theme.baseColorHint")}
        </div>
      </div>
    </>
  );
}
