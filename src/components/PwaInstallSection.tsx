"use client";

import { useTranslation } from "react-i18next";
import { isMacSafari, isStandaloneMode } from "@/src/lib/pwaInstall";
import { usePwaInstall } from "@/src/hooks/usePwaInstall";
import { themeCardStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

type Props = {
  variant?: "settings" | "compact";
};

export function PwaInstallSection({ variant = "settings" }: Props) {
  const { t } = useTranslation();
  const { canPromptInstall, installed, promptInstall } = usePwaInstall();
  const macSafari = typeof window !== "undefined" && isMacSafari();
  const standalone = typeof window !== "undefined" && isStandaloneMode();

  if (standalone) {
    return (
      <div style={{ ...themeCardStyle, marginBottom: 12 }}>
        <div style={themeSectionTitleStyle}>{t("pwa.installedTitle")}</div>
        <p style={{ ...themeMutedTextStyle, margin: 0, lineHeight: 1.6 }}>{t("pwa.installedBody")}</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: variant === "settings" ? 16 : 0 }}>
      {variant === "settings" && (
        <>
          <div style={themeSectionTitleStyle}>{t("pwa.macTitle")}</div>
          <p style={{ ...themeMutedTextStyle, marginBottom: 12, lineHeight: 1.6 }}>{t("pwa.macIntro")}</p>
        </>
      )}
      <div style={{ ...themeCardStyle, marginBottom: 12 }}>
        {variant === "settings" && (
          <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", marginBottom: 10 }}>
            {t("pwa.macStepsTitle")}
          </div>
        )}
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: "var(--t-font-size-base)",
            lineHeight: 1.75,
            color: "var(--t-text)",
          }}
        >
          <li>{t("pwa.macStep1")}</li>
          <li>{t("pwa.macStep2")}</li>
          <li>{t("pwa.macStep3")}</li>
          <li>{t("pwa.macStep4")}</li>
        </ol>
        {macSafari && (
          <p style={{ ...themeMutedTextStyle, marginTop: 12, marginBottom: 0 }}>{t("pwa.macSafariHint")}</p>
        )}
      </div>

      {(canPromptInstall || variant === "settings") && (
        <div style={{ ...themeCardStyle }}>
          <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", marginBottom: 8 }}>
            {t("pwa.chromeTitle")}
          </div>
          <p style={{ ...themeMutedTextStyle, margin: "0 0 12px", lineHeight: 1.6 }}>{t("pwa.chromeIntro")}</p>
          <button
            type="button"
            disabled={!canPromptInstall || installed}
            onClick={() => void promptInstall()}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--t-radius-md)",
              border: "none",
              background: canPromptInstall ? "var(--t-header-bg)" : "var(--t-border)",
              color: "var(--t-text-inverse)",
              fontSize: "var(--t-font-size-btn)",
              fontWeight: "bold",
              cursor: canPromptInstall ? "pointer" : "default",
              opacity: canPromptInstall ? 1 : 0.6,
              fontFamily: "var(--t-font-family)",
            }}
          >
            {canPromptInstall ? t("pwa.installButton") : t("pwa.installUnavailable")}
          </button>
        </div>
      )}
    </div>
  );
}
