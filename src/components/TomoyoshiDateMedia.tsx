"use client";

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
        {TOMOYOSHI_DATE.nameJa}
      </div>
      <div style={{ fontSize: 11, color: "#9a8b7a", lineHeight: 1.5 }}>
        つゆくさラジオのホスト。アンビエント・音楽作品をお楽しみください。
      </div>
    </div>
  );
}
