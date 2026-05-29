"use client";

import { useEffect, useState } from "react";
import {
  binauralPlaybackManager,
  type BinauralPlaybackSnapshot,
} from "@/src/lib/binauralPlaybackManager";

export default function BinauralGlobalAlarm() {
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
      <div style={{ fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 8 }}>タイマー終了</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 24, textAlign: "center" }}>
        バイノーラルビートのセッションが終わりました
      </div>
      <button
        type="button"
        onClick={() => binauralPlaybackManager.stopAlarm()}
        style={{
          padding: "16px 48px",
          borderRadius: 14,
          border: "none",
          background: "white",
          color: "#c44a4a",
          fontSize: 18,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        止める
      </button>
    </div>
  );
}
