"use client";

import { useEffect, useState } from "react";

type DeviceKind = "iphone" | "pixel" | "galaxy" | "xiaomi" | "android" | "other";

function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Pixel/i.test(ua)) return "pixel";
  if (/SM-|Galaxy|SAMSUNG/i.test(ua)) return "galaxy";
  if (/Xiaomi|Redmi|MI |POCO/i.test(ua)) return "xiaomi";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const DEVICE_LABELS: Record<DeviceKind, string> = {
  iphone: "iPhone",
  pixel: "Google Pixel",
  galaxy: "Galaxy",
  xiaomi: "Xiaomi",
  android: "その他のAndroid",
  other: "その他の端末",
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid rgba(60,40,20,0.12)",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 10,
  background: "var(--t-card-bg, white)",
};
const stepStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.8,
  color: "var(--t-text, #3d3228)",
  margin: 0,
  paddingLeft: 18,
};
const noteStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--t-text-muted, #6b5c4a)",
  lineHeight: 1.6,
  marginTop: 6,
};

function appUrl(): string {
  if (typeof window === "undefined") return "https://tsuyukusa-star.vercel.app/quick-add";
  return `${window.location.origin}/quick-add`;
}

/**
 * 「背面ダブルタップ→すぐ音声でタスク追加」など、
 * アプリを最速で起動するための機種別設定ガイド。
 */
export default function QuickLaunchGuide() {
  const [device, setDevice] = useState<DeviceKind>("other");
  const [selected, setSelected] = useState<DeviceKind | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = detectDevice();
    setDevice(d);
    setSelected(d);
  }, []);

  const show = selected ?? device;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--t-text-muted, #6b5c4a)", lineHeight: 1.7, marginBottom: 10 }}>
        「思いついた瞬間に、声でタスクを入れる」ための設定です。お使いの端末（自動判定：{DEVICE_LABELS[device]}）に合わせた手順を表示しています。
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {(Object.keys(DEVICE_LABELS) as DeviceKind[]).filter(k => k !== "other").map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setSelected(k)}
            style={{
              minHeight: 44,
              padding: "10px 14px",
              borderRadius: 16,
              fontSize: "var(--t-font-size-base)",
              cursor: "pointer",
              border: show === k ? "1.5px solid #4a6741" : "1.5px solid var(--t-border-strong)",
              background: show === k ? "var(--t-accent-bg)" : "transparent",
              color: "var(--t-text, #3d3228)",
            }}
          >
            {DEVICE_LABELS[k]}
          </button>
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
          🔗 まず共通：音声タスク追加ページのURL
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <code style={{ fontSize: 12, background: "rgba(60,40,20,0.06)", padding: "6px 8px", borderRadius: 8, flex: 1, overflowWrap: "anywhere" }}>
            {appUrl()}
          </code>
          <button
            type="button"
            onClick={() => void copyUrl()}
            style={{ minHeight: 44, padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--t-border-strong)", background: "transparent", fontSize: "var(--t-font-size-base)", cursor: "pointer", color: "var(--t-text, #3d3228)", flexShrink: 0 }}
          >
            {copied ? "コピー済み" : "コピー"}
          </button>
        </div>
        <div style={noteStyle}>このURLを開くと、すぐに音声でタスクを追加できる画面になります。以下の手順でこのURLを割り当てます。</div>
      </div>

      {show === "iphone" && (
        <>
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
              ① ショートカットを作る（1分）
            </div>
            <ol style={stepStyle}>
              <li>「ショートカット」アプリを開く → 右上の「＋」</li>
              <li>「アクションを追加」→「Web」→「URLを開く」を選ぶ</li>
              <li>URL欄に上のURLを貼り付ける</li>
              <li>名前を「つゆくさ 声で追加」にして保存</li>
            </ol>
          </div>
          <div style={sectionStyle}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
              ② 背面ダブルタップに割り当てる
            </div>
            <ol style={stepStyle}>
              <li>設定 → アクセシビリティ → タッチ → 背面タップ</li>
              <li>「ダブルタップ」→ 一覧から「つゆくさ 声で追加」を選ぶ</li>
              <li>ケースの上からでもOK。iPhoneの背面を2回トントンで起動します</li>
            </ol>
            <div style={noteStyle}>
              対応機種：iPhone 8以降（iOS 14以降）。アクションボタン搭載機（iPhone 15 Pro以降）は、設定 → アクションボタン → 「ショートカット」に同じものを割り当てるとさらに速く開けます。
            </div>
          </div>
        </>
      )}

      {show === "pixel" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
            クイックタップ（背面ダブルタップ）に割り当てる
          </div>
          <ol style={stepStyle}>
            <li>先にこのアプリを「ホーム画面に追加」しておく（Chromeメニュー →「アプリをインストール」）</li>
            <li>設定 → システム → ジェスチャー → クイックタップ</li>
            <li>「クイックタップの使用」をオン</li>
            <li>「アプリを開く」→ 「つゆくさ」を選ぶ</li>
            <li>背面を2回トントンでアプリが開きます</li>
          </ol>
          <div style={noteStyle}>
            対応：Pixel 4a（5G）以降。さらに速くするには、ホーム画面の「つゆくさ」アイコンを長押し → 「声でタスク追加」ショートカットをホームに置くのもおすすめです。
          </div>
        </div>
      )}

      {show === "galaxy" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
            Good Lock「RegiStar」で背面タップを使う
          </div>
          <ol style={stepStyle}>
            <li>Galaxy Storeから「Good Lock」を入れ、その中の「RegiStar」を有効にする</li>
            <li>RegiStar → 「背面タップ操作」をオン</li>
            <li>「ダブルタップ」→ アプリ起動 → 「つゆくさ」（先にホーム画面に追加しておく）</li>
          </ol>
          <div style={noteStyle}>
            もっと簡単な代替：設定 → 便利な機能 → サイドキー → 「2回押し」→「アプリを起動」→ つゆくさ。電源ボタン2回押しで一瞬で開きます。
          </div>
        </div>
      )}

      {show === "xiaomi" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
            背面タップ（対応機種）／ショートカット起動
          </div>
          <ol style={stepStyle}>
            <li>設定 → 追加設定 → ジェスチャーショートカット → 「背面タップ」（機種により名称が異なります）</li>
            <li>「ダブルタップ」→ アプリ起動 → 「つゆくさ」（先にホーム画面に追加しておく）</li>
            <li>背面タップ非対応の機種は、ホーム画面のアイコン長押し → 「声でタスク追加」をホームに置いてください</li>
          </ol>
        </div>
      )}

      {(show === "android" || show === "other") && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
            どのAndroidでも使える最速の方法
          </div>
          <ol style={stepStyle}>
            <li>Chromeでこのアプリを開き、メニュー → 「アプリをインストール」（ホーム画面に追加）</li>
            <li>ホーム画面の「つゆくさ」アイコンを長押し → 「声でタスク追加」が出たら、それを長押ししてホームに置く</li>
            <li>ワンタップで音声タスク追加の画面が開きます</li>
          </ol>
          <div style={noteStyle}>
            背面タップ系の機能がある機種（Pixel・Galaxy・Xiaomiなど）は、上のタブから該当機種の手順をご覧ください。
          </div>
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "var(--t-text, #1a1410)" }}>
          🎤 マイクの許可について
        </div>
        <div style={{ fontSize: 12, color: "var(--t-text-muted, #6b5c4a)", lineHeight: 1.7 }}>
          初回だけ「マイクの使用を許可しますか？」と表示されます。一度「許可」すると、以後は開いてすぐ話せます。
        </div>
      </div>
    </div>
  );
}
