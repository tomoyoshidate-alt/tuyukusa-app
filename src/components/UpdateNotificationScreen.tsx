"use client";

import { useTranslation } from "react-i18next";

type Props = {
  oldVersion: string;
  newVersion: string;
  changes: string[];
  onAskAi: () => void;
  onGoHome: () => void;
};

export function UpdateNotificationScreen({ oldVersion, newVersion, changes, onAskAi, onGoHome }: Props) {
  const { t } = useTranslation();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 21000, background: "#f5f0e8", display: "flex", flexDirection: "column", padding: "24px 20px 32px", overflowY: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}></div>
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#1a1410" }}>{t("update.title")}</div>
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: "20px 18px", border: "1px solid rgba(60,40,20,0.1)", marginBottom: 20, lineHeight: 1.75, fontSize: 14, color: "#1a1410" }}>
        <p style={{ margin: "0 0 12px", whiteSpace: "pre-line" }}>{t("update.versionLine", { oldVersion, newVersion })}</p>
        <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>{t("update.changesTitle")}</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>{changes.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}</ul>
        <p style={{ margin: "16px 0 0", fontSize: 13, color: "#6b5c4a" }}>{t("update.aiHint")}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
        <button type="button" onClick={onAskAi} style={{ padding: "14px 20px", borderRadius: 12, border: "none", background: "#1a1410", color: "#f5f0e8", fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>{t("update.askAi")}</button>
        <button type="button" onClick={onGoHome} style={{ padding: "14px 20px", borderRadius: 12, border: "1.5px solid rgba(60,40,20,0.15)", background: "transparent", color: "#3d3228", fontSize: 15, cursor: "pointer" }}>{t("update.goHome")}</button>
      </div>
    </div>
  );
}
