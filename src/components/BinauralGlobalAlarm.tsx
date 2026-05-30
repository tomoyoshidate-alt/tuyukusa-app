"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  binauralPlaybackManager,
  type BinauralPlaybackSnapshot,
} from "@/src/lib/binauralPlaybackManager";

export default function BinauralGlobalAlarm() {
  const { t } = useTranslation();
  const [playback, setPlayback] = useState<BinauralPlaybackSnapshot>(() =>
    binauralPlaybackManager.getSnapshot()
  );

  useEffect(() => binauralPlaybackManager.subscribe(setPlayback), []);

  if (!playback.isAlarmRinging) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(196,74,74,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 8 }}>{t("binaural.timerEnd")}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 24, textAlign: "center" }}>
        {t("binaural.sessionEnd")}
      </div>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("tuyukusa:open-notion-tasks"));
          binauralPlaybackManager.stopAlarm();
        }}
        style={{
          padding: "14px 32px",
          borderRadius: "var(--t-radius-lg)",
          border: "2px solid white",
          background: "transparent",
          color: "white",
          fontSize: "var(--t-font-size-lg)",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: 12,
          fontFamily: "var(--t-font-family)",
        }}
      >
        {t("binaural.reviewTasks")}
      </button>
      <button
        type="button"
        onClick={() => binauralPlaybackManager.stopAlarm()}
        style={{
          padding: "16px 48px",
          borderRadius: "var(--t-radius-lg)",
          border: "none",
          background: "white",
          color: "#c44a4a",
          fontSize: "var(--t-font-size-xl)",
          fontWeight: "bold",
          cursor: "pointer",
          fontFamily: "var(--t-font-family)",
        }}
      >
        {t("binaural.stop")}
      </button>
    </div>
  );
}
