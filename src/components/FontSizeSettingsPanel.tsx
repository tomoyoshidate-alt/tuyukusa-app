"use client";

import { useTranslation } from "react-i18next";
import { useFontSize } from "@/src/components/FontSizeProvider";
import { FONT_SIZE_IDS, FONT_SIZE_I18N_KEYS } from "@/src/lib/fontSizeSettings";
import { themeCardStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

export default function FontSizeSettingsPanel() {
  const { t } = useTranslation();
  const { fontSizeId, setFontSizeId } = useFontSize();

  return (
    <>
      <div style={themeSectionTitleStyle}>{t("fontSize.title")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 10, lineHeight: 1.5 }}>{t("fontSize.description")}</div>
      <div style={{ ...themeCardStyle, display: "flex", flexDirection: "column", gap: 6 }}>
        {FONT_SIZE_IDS.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setFontSizeId(id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderRadius: "var(--t-radius-sm)",
              border: fontSizeId === id ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
              background: fontSizeId === id ? "var(--t-accent-bg)" : "var(--t-card-bg)",
              color: "var(--t-text)",
              fontSize: "var(--t-font-size-base)",
              cursor: "pointer",
              fontFamily: "var(--t-font-family)",
              textAlign: "left",
            }}
          >
            <span>{t(FONT_SIZE_I18N_KEYS[id])}</span>
            {fontSizeId === id ? <span style={{ color: "var(--t-primary)", fontSize: "var(--t-font-size-sm)" }}>選択中</span> : null}
          </button>
        ))}
      </div>
    </>
  );
}
