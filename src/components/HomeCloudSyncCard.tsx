"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SupabaseSetupWizard } from "@/src/components/SupabaseSetupWizard";
import { isSupabaseConfigured, type SupabaseSettings } from "@/src/lib/supabaseSync";

type Props = {
  settings: SupabaseSettings;
  onComplete: (url: string, anonKey: string, syncKey: string) => void;
};

export function HomeCloudSyncCard({ settings, onComplete }: Props) {
  const { t } = useTranslation();
  const [showWizard, setShowWizard] = useState(false);

  if (isSupabaseConfigured(settings)) return null;

  return (
    <>
      <div
        style={{
          margin: "12px 16px 0",
          background: "#eef4fb",
          borderRadius: 14,
          padding: "16px",
          border: "1.5px solid rgba(126,200,227,0.45)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>
          ☁️ {t("integrationGuide.cardSupabaseTitle")}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228", marginBottom: 12, whiteSpace: "pre-line" }}>
          {t("integrationGuide.cardSupabaseBody")}
        </div>
        <div style={{ fontSize: 11, color: "#4a6741", fontWeight: "bold", marginBottom: 12 }}>
          {t("integrationGuide.recommended")}
        </div>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {t("integrationGuide.setupNow")}
        </button>
      </div>

      <SupabaseSetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={onComplete}
      />
    </>
  );
}
