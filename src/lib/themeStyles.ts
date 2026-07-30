import type { CSSProperties } from "react";

export const themeCardStyle: CSSProperties = {
  background: "var(--t-card-bg)",
  borderRadius: "var(--t-radius-md)",
  padding: "14px 16px",
  marginBottom: 8,
  border: "1px solid var(--t-border)",
  boxShadow: "var(--t-shadow)",
};

export const themeInputStyle: CSSProperties = {
  width: "100%",
  background: "var(--t-input-bg)",
  border: "1.5px solid var(--t-border-strong)",
  borderRadius: "var(--t-radius-sm)",
  padding: "10px 12px",
  fontSize: "var(--t-font-size-base)",
  color: "var(--t-text)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--t-font-family)",
};

export const themeFieldLabelStyle: CSSProperties = {
  fontSize: "var(--t-font-size-sm)",
  fontWeight: "var(--t-font-weight-bold)" as CSSProperties["fontWeight"],
  // --t-primary（薄い緑）は小さい文字だとコントラスト 2.94:1 で
  // Apple HIG / WCAG AA の 4.5:1 を割るため、文字用の濃い色を使う（6.2:1）
  color: "var(--t-primary-text, var(--t-primary))",
  marginBottom: 10,
};

/**
 * Apple HIG のタップ領域基準（モバイル既定 44×44px）を満たす最小サイズ。
 * アイコンだけのボタン・戻る矢印・閉じるボタンに使う。
 */
export const themeTapTargetStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

/** ヘッダーの戻る／閉じるリンク（44×44 の当たり判定つき） */
export const themeBackLinkStyle: CSSProperties = {
  ...themeTapTargetStyle,
  color: "inherit",
  textDecoration: "none",
  fontSize: "var(--t-font-size-xl)",
  lineHeight: 1,
  marginLeft: -10,
};

/**
 * アイコン・記号だけのボタン（× や ✕ など）。
 *
 * 見た目の大きさを変えずにタップ領域だけ広げたいので、
 * padding で 44×44 を確保し、同量の負のマージンで周囲の余白を元に戻す。
 * Apple も同じ考え方で「見た目より広い当たり判定」を持たせている。
 */
export const themeIconButtonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  margin: -12,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "var(--t-font-family)",
  flexShrink: 0,
};

/**
 * テキストリンク風のボタン。
 * padding: 0 で作るとタップ領域が文字の高さ（十数px）しか無くなるため、
 * 上下に padding を持たせて 44px を確保する。
 */
export const themeTextButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "12px 4px",
  minHeight: 44,
  fontSize: "var(--t-font-size-sm)",
  color: "var(--t-text-muted)",
  cursor: "pointer",
  fontFamily: "var(--t-font-family)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

export const themeHomeActionBtnStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--t-radius-md)",
  border: "none",
  background: "var(--t-header-bg)",
  color: "var(--t-text-inverse)",
  fontSize: "var(--t-font-size-btn)",
  fontWeight: "var(--t-font-weight-bold)" as CSSProperties["fontWeight"],
  cursor: "pointer",
  fontFamily: "var(--t-font-family)",
};

export const themeSectionTitleStyle: CSSProperties = {
  fontSize: "var(--t-font-size-heading)",
  fontWeight: "var(--t-font-weight-bold)" as CSSProperties["fontWeight"],
  color: "var(--t-text)",
  marginBottom: 4,
  paddingTop: 12,
  borderTop: "1px solid var(--t-border-strong)",
  marginTop: 8,
  fontFamily: "var(--t-font-family)",
};

export const themeMutedTextStyle: CSSProperties = {
  fontSize: "var(--t-font-size-sm)",
  color: "var(--t-text-muted)",
  fontFamily: "var(--t-font-family)",
};

export const themeAppShellStyle: CSSProperties = {
  maxWidth: 430,
  margin: "0 auto",
  minHeight: "100vh",
  background: "var(--t-bg-gradient, var(--t-bg))",
  display: "flex",
  flexDirection: "column",
  fontFamily: "var(--t-font-family)",
  color: "var(--t-text)",
  fontSize: "var(--t-font-size-base)",
};

export const themeHeaderStyle: CSSProperties = {
  background: "var(--t-header-bg)",
  color: "var(--t-header-text, var(--t-text-inverse))",
  padding: "14px 20px 12px",
  fontSize: "var(--t-font-size-xl)",
};

export const themeNavStyle: CSSProperties = {
  background: "var(--t-nav-bg)",
  display: "flex",
  borderTop: "1px solid var(--t-border)",
  fontSize: "var(--t-font-size-sm)",
};
