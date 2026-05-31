"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isIosDevice } from "@/src/lib/pwaInstall";
import { usePwaInstall } from "@/src/hooks/usePwaInstall";

export default function AddToHomeScreen() {
  const { t } = useTranslation();
  const { canPromptInstall, installed, promptInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("tuyukusa-a2hs-dismissed") === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

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
    if (isIosDevice()) {
      setShowGuide(true);
      return;
    }
    setShowGuide(true);
  }, [canPromptInstall, promptInstall]);

  if (installed) return null;
  if (dismissed && !canPromptInstall) return null;

  return (
    <>
      <div className="pwa-home-banner">
        <div style={{ fontSize: 12, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          {canPromptInstall ? t("pwa.installButton") : t("pwa.homeBannerTitle")}
        </div>
        <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 10, lineHeight: 1.5 }}>
          {canPromptInstall ? t("pwa.homeBannerInstall") : t("pwa.homeBannerBody")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => void handleInstall()} className="pwa-home-banner__primary">
            {canPromptInstall ? t("pwa.installButton") : t("pwa.homeBannerAction")}
          </button>
          {!canPromptInstall && (
            <button type="button" onClick={dismiss} className="pwa-home-banner__secondary">
              {t("pwa.later")}
            </button>
          )}
        </div>
      </div>

      {showGuide && (
        <div className="pwa-guide-overlay" onClick={() => setShowGuide(false)}>
          <div className="pwa-guide-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 12 }}>
              {t("pwa.guideTitle")}
            </div>
            {isIosDevice() ? (
              <ol style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
                <li>{t("pwa.iosStep1")}</li>
                <li>{t("pwa.iosStep2")}</li>
                <li>{t("pwa.iosStep3")}</li>
              </ol>
            ) : (
              <ol style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
                <li>{t("pwa.macStep1")}</li>
                <li>{t("pwa.macStep2")}</li>
                <li>{t("pwa.macStep3")}</li>
                <li>{t("pwa.macStep4")}</li>
              </ol>
            )}
            <button type="button" onClick={() => setShowGuide(false)} className="pwa-guide-close">
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
