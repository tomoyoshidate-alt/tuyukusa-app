"use client";

import type { CSSProperties } from "react";
import { TOMOYOSHI_DATE } from "@/src/lib/mediaUrls";

export default function TomoyoshiDateMedia() {
  return (
    <div
      style={{
        margin: "12px 16px 0",
        background: "white",
        borderRadius: 14,
        padding: "14px",
        border: "1px solid rgba(60,40,20,0.1)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
        🎵 {TOMOYOSHI_DATE.nameJa}
      </div>
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 12, lineHeight: 1.5 }}>
        つゆくさラジオのホスト。アンビエント・音楽作品をお楽しみください。
      </div>

      <div style={{ fontSize: 11, fontWeight: "bold", color: "#4a6741", marginBottom: 6 }}>Spotify</div>
      <iframe
        src={TOMOYOSHI_DATE.spotifyEmbedUrl}
        title={`${TOMOYOSHI_DATE.name} on Spotify`}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{
          width: "100%",
          height: 152,
          border: "none",
          borderRadius: 10,
          background: "#1a1410",
          marginBottom: 12,
        }}
      />
      <a
        href={TOMOYOSHI_DATE.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={linkBtnStyle}
      >
        Spotifyで開く ↗
      </a>

      <div style={{ fontSize: 11, fontWeight: "bold", color: "#4a6741", margin: "14px 0 6px" }}>
        Apple Music
      </div>
      <iframe
        src={TOMOYOSHI_DATE.appleMusicEmbedUrl}
        title={`${TOMOYOSHI_DATE.name} on Apple Music`}
        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        loading="lazy"
        style={{
          width: "100%",
          height: 175,
          border: "none",
          borderRadius: 10,
          background: "#1a1410",
          marginBottom: 12,
        }}
      />
      <a
        href={TOMOYOSHI_DATE.appleMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={linkBtnStyle}
      >
        Apple Musicで開く ↗
      </a>
    </div>
  );
}

const linkBtnStyle: CSSProperties = {
  display: "block",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1.5px solid rgba(60,40,20,0.12)",
  background: "#f5f0e8",
  color: "#8b5a2b",
  textAlign: "center",
  fontSize: 11,
  fontWeight: "bold",
  textDecoration: "none",
};
