"use client";

import { useEffect, useState } from "react";
import {
  readTimerEndSettings,
  writeTimerEndSettings,
  type TimerEndSettings,
} from "@/src/lib/timerEndSettings";

export default function AirplaneModeOption() {
  const [settings, setSettings] = useState<TimerEndSettings>({ airplaneModeOnEnd: false });
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setSettings(readTimerEndSettings());
  }, []);

  const toggle = (checked: boolean) => {
    const next = { airplaneModeOnEnd: checked };
    setSettings(next);
    writeTimerEndSettings(next);
  };

  return (
    <div style={{ marginTop: 12, marginBottom: 8 }}>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: "pointer",
          padding: "10px 12px",
          borderRadius: 10,
          background: "white",
          border: "1px solid rgba(60,40,20,0.1)",
        }}
      >
        <input
          type="checkbox"
          checked={settings.airplaneModeOnEnd}
          onChange={e => toggle(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 2, accentColor: "#c17f4a", flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, color: "#3d3228", lineHeight: 1.55 }}>
          タイマー終了後に機内モードにする
          <span style={{ display: "block", fontSize: 10, color: "#9a8b7a", marginTop: 4 }}>
            iOSショートカットアプリで事前設定が必要です
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={() => setShowGuide(v => !v)}
        style={{
          marginTop: 8,
          background: "none",
          border: "none",
          color: "#8b5a2b",
          fontSize: 11,
          fontWeight: "bold",
          cursor: "pointer",
          padding: "4px 0",
        }}
      >
        {showGuide ? "▲ ガイドを閉じる" : "▼ ショートカットの作り方"}
      </button>

      {showGuide && (
        <div
          style={{
            marginTop: 8,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fdf0e4",
            border: "1px solid rgba(193,127,74,0.25)",
            fontSize: 11,
            color: "#3d3228",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: "bold", color: "#8b5a2b", marginBottom: 8 }}>
            iOS「ショートカット」で機内モードをオンにする
          </div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>iPhoneの「ショートカット」アプリを開く</li>
            <li>右上「＋」→ 新規ショートカットを作成</li>
            <li>「アクションを追加」→ 検索で「機内モード」を選ぶ</li>
            <li>「機内モードを設定」を追加し、<strong>オン</strong>にする</li>
            <li>ショートカット名を「<strong>機内モードをオン</strong>」に変更（名前は完全一致）</li>
            <li>完了して保存</li>
          </ol>
          <p style={{ margin: "10px 0 0", fontSize: 10, color: "#9a8b7a" }}>
            ※ WebアプリからiOSの機内モードは直接操作できません。タイマー終了時にショートカットアプリを起動して切り替えを促します。
          </p>
        </div>
      )}
    </div>
  );
}
