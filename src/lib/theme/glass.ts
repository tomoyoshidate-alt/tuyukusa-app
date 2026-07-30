import type { ThemeCssVars } from "./types";
import { hexToRgb } from "./colorUtils";

/**
 * Liquid Glass（Apple 2025〜のデザイン言語）風の質感をテーマトークンに注入する。
 * どのテーマモード（natural / light / dark / time）でも、そのモードの色をベースに
 * 半透明のガラス面・柔らかい影・角丸・背景の淡い光を合成する。
 *
 * 読みやすさ優先の「控えめガラス」設定：
 * カード面は約 7 割の不透明度を残し、高齢の患者さんにも文字がはっきり見えるようにする。
 */

/**
 * 面トークンごとの不透明度（%）。数値を下げるほどガラスが濃くなる。
 *
 * HIG は画面を2層に分け、ガラスは「機能層」（ヘッダー・ナビ・浮いた操作）に限る。
 * コンテンツ層（本文カード・入力欄）に強くかけると文字が読みにくくなるため、
 * 本文側は不透明寄り、機能層はしっかり透ける、という配分にしている。
 */
const SURFACE_OPACITY: Array<[string, number]> = [
  // ── コンテンツ層（読むもの）：不透明寄り ──
  ["--t-card-bg", 88],
  ["--t-input-bg", 90],
  ["--t-primary-bg", 88],
  ["--t-border", 80],
  // ── 機能層（操作するもの）：ガラスらしく ──
  ["--t-header-bg", 70],
  ["--t-nav-bg", 70],
];

function isDarkColor(value: string | undefined): boolean {
  if (!value) return false;
  const rgb = hexToRgb(value);
  if (!rgb) return false;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b < 110;
}

function canMix(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("gradient") &&
    !value.includes("color-mix")
  );
}

function prefersReducedTransparency(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
  } catch {
    return false;
  }
}

export function toGlassVars(vars: ThemeCssVars): ThemeCssVars {
  const out: ThemeCssVars = { ...vars };
  const dark = isDarkColor(vars["--t-bg"]);

  // 1) 面の半透明化（元テーマの色を保ったまま透過させる）
  //    OS で「透明度を下げる」を選んでいる人には不透明のまま（globals.css 側でぼかしも無効化）
  if (!prefersReducedTransparency()) {
    for (const [key, pct] of SURFACE_OPACITY) {
      const v = out[key];
      if (canMix(v)) {
        out[key] = `color-mix(in srgb, ${v} ${pct}%, transparent)`;
      }
    }
  }

  // 2) ガラスらしい影：外側の柔らかい落ち影 ＋ 内側上端のハイライト（光の縁）
  out["--t-shadow"] = dark
    ? "0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)"
    : "0 10px 28px rgba(44, 32, 22, 0.10), 0 2px 8px rgba(44, 32, 22, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 0 0 0 0.5px rgba(255, 255, 255, 0.30)";

  // 3) Apple 風の大きめ角丸
  out["--t-radius-sm"] = "12px";
  out["--t-radius-md"] = "16px";
  out["--t-radius-lg"] = "20px";

  // 4) 背景に淡い光のグラデーション（ガラス越しに透ける景色）
  //    テーマの primary / accent 色を薄く滲ませるので、どのモードでも馴染む
  const primary = vars["--t-primary"] ?? "#7a9e7e";
  const accent = vars["--t-accent"] ?? primary;
  const baseBg = vars["--t-bg-gradient"] || vars["--t-bg"] || "#faf8f4";
  const glow = dark ? 18 : 13;
  const glowSub = dark ? 13 : 9;
  out["--t-bg-gradient"] = [
    `radial-gradient(1100px 780px at 10% -8%, color-mix(in srgb, ${primary} ${glow}%, transparent), transparent 62%)`,
    `radial-gradient(900px 680px at 108% 14%, color-mix(in srgb, ${accent} ${glowSub}%, transparent), transparent 62%)`,
    `radial-gradient(1000px 760px at 50% 118%, color-mix(in srgb, ${primary} ${glowSub}%, transparent), transparent 60%)`,
    baseBg,
  ].join(", ");

  return out;
}
