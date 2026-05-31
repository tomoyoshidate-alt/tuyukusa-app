"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  onClose: () => void;
  onTryBB: () => void;
};

export default function BinauralExplainPage({ onClose, onTryBB }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 210,
        background: "rgba(26,20,16,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "#f5f0e8",
          borderRadius: "20px 20px 0 0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 16px 12px",
            borderBottom: "1px solid rgba(60,40,20,0.08)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 14,
              cursor: "pointer",
              color: "#8b5a2b",
              padding: "4px 0",
              fontWeight: "bold",
            }}
          >
            ← 戻る
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9a8b7a", padding: 4 }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          <h1 style={{ fontSize: 18, fontWeight: "bold", color: "#3d3228", margin: "0 0 16px", lineHeight: 1.4 }}>
            バイノーラルビート（BB）とは？
          </h1>

          <Section>
            <p style={paragraphStyle}>
              左右の耳にわずかに異なる周波数の音を聞かせると、
              脳がその差の周波数で共鳴する現象です。
            </p>
            <p style={paragraphStyle}>
              例：左耳200Hz＋右耳210Hz → 脳が10Hzのアルファ波を生成
            </p>
            <div style={warningStyle}>
              効果的に使うには必ずステレオイヤホンまたはヘッドホンが必要です。
            </div>
          </Section>

          <Section title="【脳波と効果】">
            <Bullet>デルタ波（0.5-4Hz）：深い睡眠・回復・無意識</Bullet>
            <Bullet>シータ波（4-8Hz）：瞑想・創造性・深いリラックス・入眠</Bullet>
            <Bullet>アルファ波（8-13Hz）：リラックス・集中・ストレス軽減</Bullet>
            <Bullet>ベータ波（13-30Hz）：集中・思考・問題解決・活動</Bullet>
          </Section>

          <Section title="【漢方・養生との関連】">
            <Bullet>・朝のアルファ波は「気」の流れを整え、陽気を養う</Bullet>
            <Bullet>・睡眠前のデルタ波は「腎」を補い、深い回復を促す</Bullet>
            <Bullet>・シータ波瞑想は「心」を落ち着かせ、自律神経を整える</Bullet>
            <Bullet>・ストレス時のアルファ波は「肝」の気滞を解消する</Bullet>
          </Section>

          <Section title="【おすすめの使い方】">
            <Bullet>朝：アルファ波10Hz＋森の音で目覚めを整える</Bullet>
            <Bullet>集中：ベータ波20Hz＋雨音または無音</Bullet>
            <Bullet>瞑想：シータ波6Hz＋水琴窟または焚き火</Bullet>
            <Bullet>就寝前：デルタ波2Hz＋波音または雨音</Bullet>
            <Bullet>ストレス時：アルファ波8Hz＋焚き火または水琴窟</Bullet>
          </Section>

          <Section title="【使用上の注意】">
            <Bullet>・てんかん・光過敏症の方は使用前に医師に相談</Bullet>
            <Bullet>・運転中・危険な作業中は使用しない</Bullet>
            <Bullet>・最初は5〜10分から始める</Bullet>
            <Bullet>・効果には個人差がある</Bullet>
          </Section>
        </div>

        <div
          style={{
            padding: "12px 16px 24px",
            borderTop: "1px solid rgba(60,40,20,0.08)",
            flexShrink: 0,
            background: "#f5f0e8",
          }}
        >
          <button type="button" onClick={onTryBB} style={tryBtnStyle}>
            BBを試してみる
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <h2 style={{ fontSize: 14, fontWeight: "bold", color: "#4a6741", margin: "0 0 10px" }}>{title}</h2>
      )}
      {children}
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <p style={{ ...paragraphStyle, marginBottom: 6, paddingLeft: 4 }}>{children}</p>
  );
}

const paragraphStyle: CSSProperties = {
  fontSize: 13,
  color: "#3d3228",
  lineHeight: 1.75,
  margin: "0 0 10px",
};

const warningStyle: CSSProperties = {
  fontSize: 12,
  color: "#8b5a2b",
  background: "#fdf0e4",
  border: "1px solid rgba(193,127,74,0.3)",
  borderRadius: 10,
  padding: "10px 12px",
  lineHeight: 1.6,
  marginTop: 4,
};

const tryBtnStyle: CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 15,
  fontWeight: "bold",
  cursor: "pointer",
};
