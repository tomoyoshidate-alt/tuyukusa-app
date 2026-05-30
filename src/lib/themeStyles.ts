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
  color: "var(--t-primary)",
  marginBottom: 10,
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
  color: "var(--t-text-inverse)",
  padding: "14px 20px 12px",
  fontSize: "var(--t-font-size-xl)",
};

export const themeNavStyle: CSSProperties = {
  background: "var(--t-nav-bg)",
  display: "flex",
  borderTop: "1px solid var(--t-border)",
  fontSize: "var(--t-font-size-sm)",
};
