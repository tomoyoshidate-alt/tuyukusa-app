"use client";

import { useTranslation } from "react-i18next";
import { isIosDevice, isMacSafari } from "@/src/lib/pwaInstall";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PwaInstallGuideModal({ open, onClose }: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  const macSafari = typeof window !== "undefined" && isMacSafari();
  const ios = typeof window !== "undefined" && isIosDevice();

  return (
    <div className="pwa-guide-overlay" onClick={onClose}>
      <div className="pwa-guide-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 12 }}>
          {t("pwa.desktopShortcutTitle")}
        </div>
        {macSafari ? (
          <p style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, margin: "0 0 12px" }}>
            {t("pwa.safariShortcutGuide")}
          </p>
        ) : ios ? (
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
        <button type="button" onClick={onClose} className="pwa-guide-close">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
