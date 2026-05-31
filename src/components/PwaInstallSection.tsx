"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { PwaInstallGuideModal } from "@/src/components/PwaInstallGuideModal";
import { isMacSafari, isStandaloneMode } from "@/src/lib/pwaInstall";
import { usePwaInstall } from "@/src/hooks/usePwaInstall";
import { themeCardStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

type Props = {
  variant?: "settings" | "compact" | "onboarding";
};

export function PwaInstallSection({ variant = "settings" }: Props) {
  const { t } = useTranslation();
  const { canPromptInstall, installed, promptInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const macSafari = typeof window !== "undefined" && isMacSafari();
  const standalone = typeof window !== "undefined" && isStandaloneMode();

  const handleInstallClick = useCallback(async () => {
    if (canPromptInstall) {
      await promptInstall();
      return;
    }
    setShowGuide(true);
  }, [canPromptInstall, promptInstall]);

  if (standalone) {
    return (
      <div style={{ ...themeCardStyle, marginBottom: 12 }}>
        <div style={themeSectionTitleStyle}>{t("pwa.installedTitle")}</div>
        <p style={{ ...themeMutedTextStyle, margin: 0, lineHeight: 1.6 }}>{t("pwa.installedBody")}</p>
      </div>
    );
  }

  const titleKey = variant === "settings" || variant === "onboarding" ? "pwa.desktopShortcutTitle" : "pwa.macTitle";

  return (
    <>
      <div style={{ marginBottom: variant === "settings" ? 16 : 12 }}>
        {(variant === "settings" || variant === "onboarding") && (
          <>
            <div style={themeSectionTitleStyle}>{t(titleKey)}</div>
            <p style={{ ...themeMutedTextStyle, marginBottom: 12, lineHeight: 1.6 }}>
              {variant === "onboarding" ? t("pwa.onboardingIntro") : t("pwa.macIntro")}
            </p>
          </>
        )}
        <div style={{ ...themeCardStyle, marginBottom: 12 }}>
          {macSafari ? (
            <>
              <p style={{ ...themeMutedTextStyle, margin: "0 0 12px", lineHeight: 1.7 }}>{t("pwa.safariShortcutGuide")}</p>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                style={installBtnStyle(true)}
              >
                {t("pwa.showShortcutSteps")}
              </button>
            </>
          ) : (
            <>
              {(variant === "settings" || variant === "onboarding") && (
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
            </>
          )}
        </div>

        {!macSafari && (
          <div style={{ ...themeCardStyle }}>
            <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", marginBottom: 8 }}>
              {t("pwa.chromeTitle")}
            </div>
            <p style={{ ...themeMutedTextStyle, margin: "0 0 12px", lineHeight: 1.6 }}>{t("pwa.chromeIntro")}</p>
            <button
              type="button"
              disabled={!canPromptInstall || installed}
              onClick={() => void handleInstallClick()}
              style={installBtnStyle(canPromptInstall && !installed)}
            >
              {canPromptInstall ? t("pwa.installButton") : t("pwa.installUnavailable")}
            </button>
          </div>
        )}
      </div>

      <PwaInstallGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}

function installBtnStyle(enabled: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "var(--t-radius-md)",
    border: "none",
    background: enabled ? "var(--t-header-bg)" : "var(--t-border)",
    color: "var(--t-text-inverse)",
    fontSize: "var(--t-font-size-btn)",
    fontWeight: "bold",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.6,
    fontFamily: "var(--t-font-family)",
  };
}
