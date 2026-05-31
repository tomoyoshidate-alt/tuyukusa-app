"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { isIosDevice } from "@/src/lib/pwaInstall";
import { usePwaInstall } from "@/src/hooks/usePwaInstall";

function getAppPageUrl(): string {
  if (typeof window === "undefined") return "https://tuyukusa-app.vercel.app";
  return window.location.origin;
}

type Props = {
  variant?: "home" | "settings";
};

export default function AddToHomeScreen({ variant = "home" }: Props) {
  const { t } = useTranslation();
  const { canPromptInstall, installed, promptInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("tuyukusa-a2hs-dismissed") === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem("tuyukusa-a2hs-dismissed", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (canPromptInstall) {
      await promptInstall();
      return;
    }
    setShowGuide(true);
  }, [canPromptInstall, promptInstall]);

  const handleCopyForSafari = useCallback(async () => {
    const url = getAppPageUrl();
    try {
      await navigator.clipboard.writeText(url);
      setToast(t("pwa.safariPasteToast"));
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setToast(t("pwa.safariPasteToast"));
      } catch {
        setToast(url);
      }
    }
  }, [t]);

  const showIphoneGuide = isIosDevice();
  const isSettings = variant === "settings";

  if (installed) return null;
  if (!isSettings && dismissed && !canPromptInstall) return null;

  return (
    <>
      <div style={isSettings ? settingsCardStyle : undefined} className={isSettings ? undefined : "pwa-home-banner"}>
        <div style={{ fontSize: isSettings ? 13 : 12, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          {canPromptInstall ? t("pwa.installButton") : t("pwa.homeBannerTitle")}
        </div>
        <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 10, lineHeight: 1.5 }}>
          {canPromptInstall ? t("pwa.homeBannerInstall") : t("pwa.homeBannerBody")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className={isSettings ? undefined : "pwa-home-banner__primary"}
            style={isSettings ? settingsPrimaryBtnStyle : undefined}
          >
            {canPromptInstall ? t("pwa.installButton") : t("pwa.homeBannerAction")}
          </button>
          {!canPromptInstall && !isSettings && (
            <button type="button" onClick={dismiss} className="pwa-home-banner__secondary">
              {t("pwa.later")}
            </button>
          )}
        </div>
      </div>

      {showGuide && (
        <div className="pwa-guide-overlay" onClick={() => setShowGuide(false)}>
          <div className="pwa-guide-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 16 }}>
              {t("pwa.guideTitle")}
            </div>

            {showIphoneGuide ? (
              <div style={{ marginBottom: 16 }}>
                <div style={sectionTitleStyle}>{t("pwa.guideIphoneTitle")}</div>
                <ol style={stepsStyle}>
                  <li>{t("pwa.iosStep1")}</li>
                  <li>{t("pwa.iosStep2")}</li>
                  <li>{t("pwa.iosStep3")}</li>
                  <li>{t("pwa.iosStep4")}</li>
                </ol>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={sectionTitleStyle}>{t("pwa.guideMacTitle")}</div>
                <ol style={stepsStyle}>
                  <li>{t("pwa.macStep1")}</li>
                  <li>{t("pwa.macStep2")}</li>
                  <li>{t("pwa.macStep3")}</li>
                </ol>
              </div>
            )}

            <button type="button" onClick={() => void handleCopyForSafari()} style={copyBtnStyle}>
              {t("pwa.copySafariButton")}
            </button>

            <button type="button" onClick={() => setShowGuide(false)} className="pwa-guide-close">
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={toastStyle} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

const settingsCardStyle: CSSProperties = {
  background: "white",
  borderRadius: 12,
  padding: 14,
  border: "1px solid rgba(60,40,20,0.1)",
  marginBottom: 12,
};

const settingsPrimaryBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: "bold",
  color: "#3d3228",
  marginBottom: 8,
};

const stepsStyle: CSSProperties = {
  fontSize: 13,
  color: "#3d3228",
  lineHeight: 1.85,
  paddingLeft: 20,
  margin: 0,
};

const copyBtnStyle: CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: 10,
};

const toastStyle: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 28,
  transform: "translateX(-50%)",
  zIndex: 50000,
  maxWidth: "min(92vw, 360px)",
  padding: "12px 16px",
  borderRadius: 12,
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 13,
  fontWeight: "bold",
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
  lineHeight: 1.5,
};
