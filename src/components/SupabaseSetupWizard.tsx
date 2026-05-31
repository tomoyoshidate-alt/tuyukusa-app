"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSupabaseConfigured,
  syncWithSupabase,
  SUPABASE_SETUP_SQL,
  type SupabaseSettings,
} from "@/src/lib/supabaseSync";
import { SUPABASE_WIZARD_STEPS } from "@/src/lib/integrationGuide";

type Props = {
  settings: SupabaseSettings;
  onChange: (patch: Partial<SupabaseSettings>) => void;
  onComplete: () => void;
  onCancel: () => void;
  onSynced: () => void;
};

function MockScreenshot({ label, step }: { label: string; step: number }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, #eef4fb 0%, #dce8f5 100%)",
        border: "2px dashed rgba(126,200,227,0.6)",
        borderRadius: 12,
        padding: "20px 16px",
        marginBottom: 14,
        textAlign: "center",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}></div>
      <div style={{ fontSize: 11, fontWeight: "bold", color: "#4a6741", marginBottom: 4 }}>
        STEP {step} {label}
      </div>
      <div style={{ fontSize: 10, color: "#7ec8e3" }}>（設定画面のイメージ）</div>
    </div>
  );
}

export function SupabaseSetupWizard({ settings, onChange, onComplete, onCancel, onSynced }: Props) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [showSql, setShowSql] = useState(false);

  const isFormStep = stepIndex >= SUPABASE_WIZARD_STEPS.length;
  const configured = isSupabaseConfigured(settings);

  const runSync = async () => {
    setSyncing(true);
    setMessage("");
    try {
      await syncWithSupabase(settings, "merge");
      onChange({ lastSyncAt: Date.now(), lastError: undefined, enabled: true });
      onSynced();
      setMessage(t("supabase.syncDone"));
      setTimeout(onComplete, 800);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("supabase.syncFailed"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 21000,
        background: "rgba(26,20,16,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#f5f0e8",
          borderRadius: "20px 20px 0 0",
          padding: "20px 18px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: "bold", color: "#1a1410" }}>
            {t("integrationGuide.supabaseWizardTitle")}
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#9a8b7a" }}
          >
            ×
          </button>
        </div>

        {!isFormStep && (
          <>
            <MockScreenshot
              label={SUPABASE_WIZARD_STEPS[stepIndex].screenshotHint}
              step={stepIndex + 1}
            />
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "#3d3228", marginBottom: 16, whiteSpace: "pre-line" }}>
              {t(SUPABASE_WIZARD_STEPS[stepIndex].descriptionKey)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex(i => i - 1)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    border: "1.5px solid rgba(60,40,20,0.15)",
                    background: "white",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {t("integrationGuide.back")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setStepIndex(i => i + 1)}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "#1a1410",
                  color: "#f5f0e8",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {stepIndex < SUPABASE_WIZARD_STEPS.length - 1
                  ? t("integrationGuide.nextStep")
                  : t("integrationGuide.enterCredentials")}
              </button>
            </div>
          </>
        )}

        {isFormStep && (
          <>
            <div style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.7, marginBottom: 12 }}>
              {t("integrationGuide.supabaseFormIntro")}
            </div>
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
              {t("supabase.urlLabel")}
            </div>
            <input
              type="url"
              placeholder="https://xxxx.supabase.co"
              value={settings.url}
              onChange={e => onChange({ url: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(60,40,20,0.12)",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
              {t("supabase.anonKeyLabel")}
            </div>
            <input
              type="password"
              placeholder="eyJ..."
              value={settings.anonKey}
              onChange={e => onChange({ anonKey: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(60,40,20,0.12)",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
              {t("supabase.syncIdLabel")}
            </div>
            <input
              type="text"
              placeholder={t("supabase.syncIdPlaceholder")}
              value={settings.syncId}
              onChange={e => onChange({ syncId: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(60,40,20,0.12)",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowSql(v => !v)}
              style={{
                width: "100%",
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(126,200,227,0.5)",
                background: "white",
                color: "#4a6741",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {showSql ? "▼" : "▶"} {t("supabase.setupSql")}
            </button>
            {showSql && (
              <pre
                style={{
                  fontSize: 9,
                  background: "#1a1410",
                  color: "#c5d8be",
                  padding: 10,
                  borderRadius: 8,
                  overflowX: "auto",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}
              >
                {SUPABASE_SETUP_SQL}
              </pre>
            )}
            <button
              type="button"
              disabled={!configured || syncing}
              onClick={() => void runSync()}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: configured ? "#4a6741" : "#9a8b7a",
                color: "#f5f0e8",
                fontSize: 15,
                fontWeight: "bold",
                cursor: configured && !syncing ? "pointer" : "default",
              }}
            >
              {syncing ? t("common.syncing") : t("integrationGuide.supabaseFinish")}
            </button>
            {message && (
              <div
                style={{
                  fontSize: 12,
                  color: message.includes("失敗") ? "#c44a4a" : "#4a6741",
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {message}
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: 10, color: "#9a8b7a", textAlign: "center", marginTop: 12 }}>
          {isFormStep
            ? t("integrationGuide.supabaseFormStep")
            : `${stepIndex + 1} / ${SUPABASE_WIZARD_STEPS.length}`}
        </div>
      </div>
    </div>
  );
}
