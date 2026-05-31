"use client";

import { useEffect, useState } from "react";
import {
  radioPlaybackManager,
  type RadioPlaybackSnapshot,
} from "@/src/lib/radioPlaybackManager";

/** Bottom mini player – sits above the tab bar in page.tsx. */
export default function RadioMiniPlayer() {
  const [snap, setSnap] = useState<RadioPlaybackSnapshot>(() => radioPlaybackManager.getSnapshot());

  useEffect(() => radioPlaybackManager.subscribe(setSnap), []);

  if (!snap.isPlaying || !snap.audioUrl) return null;

  return (
    <div
      style={{
        background: "#1a1410",
        color: "#f5f0e8",
        borderTop: "1px solid rgba(193,127,74,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        boxSizing: "border-box",
      }}
    >
      <button
        type="button"
        onClick={() => radioPlaybackManager.pause()}
        aria-label="停止"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background: "#c17f4a",
          color: "#1a1410",
          fontSize: 14,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        ⏸
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>再生中</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: "bold",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {snap.title}
        </div>
      </div>
      <button
        type="button"
        onClick={() => radioPlaybackManager.pause()}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: "1.5px solid rgba(245,240,232,0.25)",
          background: "transparent",
          color: "#f5f0e8",
          fontSize: 11,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        停止
      </button>
    </div>
  );
}
