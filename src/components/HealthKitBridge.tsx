"use client";

import { useState, type CSSProperties } from "react";
import {
  buildHealthImportUrl,
  formatHealthSummary,
  HEALTH_SHORTCUT_URL,
  type HealthData,
} from "@/src/lib/healthData";

type Props = {
  healthData: HealthData;
  compact?: boolean;
};

export default function HealthKitBridge({ healthData, compact }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const importUrlExample =
    typeof window !== "undefined" ? buildHealthImportUrl(window.location.origin) : "";

  const openShortcuts = () => {
    window.location.href = HEALTH_SHORTCUT_URL;
    setTimeout(() => setShowGuide(true), 600);
  };

  return (
    <>
      <div
        style={{
          margin: compact ? 0 : "12px 16px 0",
          background: "white",
          borderRadius: 12,
          padding: "14px",
          border: "1px solid rgba(60,40,20,0.1)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741", marginBottom: 6 }}>
          ❤️ iOSヘルスケア連携
        </div>
        <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 10, lineHeight: 1.6 }}>
          ショートカット経由で睡眠・歩数・心拍数を送信。AI診断と相談に活用されます。
        </div>
        {healthData.updatedAt && (
          <div style={{ fontSize: 12, color: "#3d3228", marginBottom: 10, padding: "8px 10px", background: "#e8f0e4", borderRadius: 8 }}>
            ✓ {formatHealthSummary(healthData)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={openShortcuts} style={primaryBtn}>
            ヘルスケアデータを送る
          </button>
          <button type="button" onClick={() => setShowGuide(true)} style={secondaryBtn}>
            設定方法
          </button>
        </div>
      </div>

      {showGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(26,20,16,0.65)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowGuide(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#f5f0e8",
              borderRadius: "20px 20px 0 0",
              padding: "20px 16px 28px",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 12 }}>
              iOSショートカットの設定方法
            </div>
            <ol style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, paddingLeft: 20, margin: "0 0 16px" }}>
              <li>iPhoneの<strong>ショートカット</strong>アプリを開く</li>
              <li>新規ショートカットを作成し、名前を「<strong>つゆくさ ヘルス送信</strong>」にする</li>
              <li>「ヘルスケア」から<strong>睡眠分析</strong>・<strong>歩数</strong>・<strong>心拍数</strong>を取得</li>
              <li>「URL」アクションで以下の形式のURLを開く（値を変数で埋め込む）:</li>
            </ol>
            <div
              style={{
                fontSize: 10,
                background: "#1a1410",
                color: "#e8a86a",
                padding: 12,
                borderRadius: 8,
                wordBreak: "break-all",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {importUrlExample || "https://tuyukusa-app.vercel.app/?healthImport=1&sleepHours=7&steps=8000&heartRate=68"}
            </div>
            <div style={{ fontSize: 12, color: "#9a8b7a", lineHeight: 1.6, marginBottom: 16 }}>
              ショートカット実行後、このアプリが開きデータが保存されます。「ヘルスケアデータを送る」ボタンからショートカットを起動できます。
            </div>
            <button type="button" onClick={() => setShowGuide(false)} style={{ ...primaryBtn, width: "100%" }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const primaryBtn: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 12,
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid rgba(60,40,20,0.12)",
  background: "white",
  color: "#3d3228",
  fontSize: 12,
  cursor: "pointer",
};
