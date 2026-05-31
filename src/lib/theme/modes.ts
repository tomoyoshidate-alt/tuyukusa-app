import type { ThemeCssVars } from "./types";
import { getTimePeriod, type TimePeriod } from "./timeTheme";

const SHARED_TOKENS: ThemeCssVars = {
  "--t-bg-gradient-start": "#faf8f4",
  "--t-bg-gradient-end": "#faf8f4",
  "--t-radius-sm": "8px",
  "--t-radius-md": "12px",
  "--t-radius-lg": "14px",
  "--t-shadow": "0 2px 8px rgba(44, 32, 22, 0.06)",
  "--t-font-family": 'var(--font-noto-sans), "Hiragino Sans", "Yu Gothic", sans-serif',
  "--t-font-size-sm": "11px",
  "--t-font-size-base": "13px",
  "--t-font-size-lg": "15px",
  "--t-font-size-xl": "18px",
  "--t-font-weight-bold": "700",
  "--t-error": "#c44a4a",
  "--t-success": "#7a9e7e",
  "--t-notion-bg": "#eef4fb",
  "--t-notion-border": "rgba(126,200,227,0.35)",
  "--t-diagnosis-bg": "linear-gradient(160deg, #f0ebe3, #e8e0d4)",
  "--t-diagnosis-text": "#2c2016",
};

function lightShell(overrides: ThemeCssVars): ThemeCssVars {
  return {
    ...SHARED_TOKENS,
    "--t-bg": "#faf8f4",
    "--t-bg-gradient": "#faf8f4",
    "--t-card-bg": "#ffffff",
    "--t-primary-bg": "#f5f1eb",
    "--t-input-bg": "#f5f1eb",
    "--t-border": "#e8e0d4",
    "--t-border-strong": "#e8e0d4",
    "--t-text": "#2c2016",
    "--t-text-muted": "#6b5d4f",
    "--t-text-inverse": "#faf8f4",
    "--t-primary": "#7a9e7e",
    "--t-primary-light": "#96b69a",
    "--t-accent": "#7a9e7e",
    "--t-accent-bg": "#eef4ef",
    "--t-header-bg": "#f0ebe3",
    "--t-header-text": "#2c2016",
    "--t-nav-bg": "#f0ebe3",
    "--t-nav-text": "#2c2016",
    "--t-nav-active": "#7a9e7e",
    "--t-nav-inactive": "#6b5d4f",
    "--t-checkbox-accent": "#7a9e7e",
    ...overrides,
  };
}

export const NATURAL_MODE_VARS = lightShell({});

export const LIGHT_MODE_VARS = lightShell({
  "--t-bg": "#ffffff",
  "--t-bg-gradient": "#ffffff",
  "--t-primary-bg": "#f5f5f5",
  "--t-input-bg": "#f5f5f5",
  "--t-border": "#e5e5e5",
  "--t-border-strong": "#d8d8d8",
  "--t-accent": "#5a9e6a",
  "--t-primary": "#5a9e6a",
  "--t-primary-light": "#72b882",
  "--t-accent-bg": "#eef6ef",
  "--t-header-bg": "#f5f5f5",
  "--t-nav-bg": "#f5f5f5",
  "--t-nav-active": "#5a9e6a",
  "--t-checkbox-accent": "#5a9e6a",
});

export const DARK_MODE_VARS: ThemeCssVars = {
  ...SHARED_TOKENS,
  "--t-bg": "#121212",
  "--t-bg-gradient": "linear-gradient(165deg, #0a0a0a 0%, #121212 50%, #1e1e1e 100%)",
  "--t-card-bg": "#1e1e1e",
  "--t-primary-bg": "#2a2a2a",
  "--t-input-bg": "#2a2a2a",
  "--t-border": "rgba(255,255,255,0.1)",
  "--t-border-strong": "rgba(255,255,255,0.15)",
  "--t-text": "#e0e0e0",
  "--t-text-muted": "#9e9e9e",
  "--t-text-inverse": "#121212",
  "--t-primary": "#81c784",
  "--t-primary-light": "#a5d6a7",
  "--t-accent": "#ffb74d",
  "--t-accent-bg": "rgba(255,183,77,0.12)",
  "--t-header-bg": "#0a0a0a",
  "--t-header-text": "#e0e0e0",
  "--t-nav-bg": "#0a0a0a",
  "--t-nav-text": "#e0e0e0",
  "--t-nav-active": "#ffb74d",
  "--t-nav-inactive": "rgba(224,224,224,0.4)",
  "--t-checkbox-accent": "#81c784",
  "--t-diagnosis-bg": "linear-gradient(160deg, #0a0a0a, #1e1e1e)",
  "--t-diagnosis-text": "#e0e0e0",
};

const TIME_PERIOD_OVERRIDES: Record<TimePeriod, ThemeCssVars> = {
  morning: {
    "--t-bg": "#fdf6ec",
    "--t-bg-gradient": "#fdf6ec",
    "--t-accent": "#e8894a",
    "--t-primary": "#e8894a",
    "--t-primary-light": "#f0a56a",
    "--t-accent-bg": "#fcebd8",
    "--t-header-bg": "#fcebd8",
    "--t-nav-bg": "#fcebd8",
    "--t-nav-active": "#e8894a",
    "--t-checkbox-accent": "#e8894a",
    "--t-diagnosis-bg": "linear-gradient(160deg, #fcebd8, #fdf6ec)",
  },
  day: {
    "--t-bg": "#f5f9f5",
    "--t-bg-gradient": "#f5f9f5",
    "--t-accent": "#5a9e6a",
    "--t-primary": "#5a9e6a",
    "--t-primary-light": "#72b882",
    "--t-accent-bg": "#e8f2e8",
    "--t-header-bg": "#e8f2e8",
    "--t-nav-bg": "#e8f2e8",
    "--t-nav-active": "#5a9e6a",
    "--t-checkbox-accent": "#5a9e6a",
    "--t-diagnosis-bg": "linear-gradient(160deg, #e8f2e8, #f5f9f5)",
  },
  evening: {
    "--t-bg": "#f8f0f5",
    "--t-bg-gradient": "#f8f0f5",
    "--t-accent": "#c4728a",
    "--t-primary": "#c4728a",
    "--t-primary-light": "#d48fa3",
    "--t-accent-bg": "#f2e0ea",
    "--t-header-bg": "#f2e0ea",
    "--t-nav-bg": "#f2e0ea",
    "--t-nav-active": "#c4728a",
    "--t-checkbox-accent": "#c4728a",
    "--t-diagnosis-bg": "linear-gradient(160deg, #f2e0ea, #f8f0f5)",
  },
  night: {
    "--t-bg": "#1a1820",
    "--t-bg-gradient": "#1a1820",
    "--t-card-bg": "#242030",
    "--t-primary-bg": "#2e2a38",
    "--t-input-bg": "#2e2a38",
    "--t-border": "rgba(232,228,240,0.12)",
    "--t-border-strong": "rgba(232,228,240,0.18)",
    "--t-text": "#e8e4f0",
    "--t-text-muted": "#a8a0b8",
    "--t-text-inverse": "#1a1820",
    "--t-accent": "#7b8cde",
    "--t-primary": "#7b8cde",
    "--t-primary-light": "#99a5eb",
    "--t-accent-bg": "rgba(123,140,222,0.15)",
    "--t-header-bg": "#12101a",
    "--t-header-text": "#e8e4f0",
    "--t-nav-bg": "#12101a",
    "--t-nav-text": "#e8e4f0",
    "--t-nav-active": "#7b8cde",
    "--t-nav-inactive": "rgba(232,228,240,0.45)",
    "--t-checkbox-accent": "#7b8cde",
    "--t-diagnosis-bg": "linear-gradient(160deg, #12101a, #1a1820)",
    "--t-diagnosis-text": "#e8e4f0",
  },
};

export function getTimeModeVars(date = new Date()): ThemeCssVars {
  const period = getTimePeriod(date);
  return lightShell(TIME_PERIOD_OVERRIDES[period]);
}

export function getThemeModeVars(mode: "natural" | "time" | "light" | "dark", date = new Date()): ThemeCssVars {
  switch (mode) {
    case "natural":
      return NATURAL_MODE_VARS;
    case "light":
      return LIGHT_MODE_VARS;
    case "dark":
      return DARK_MODE_VARS;
    case "time":
      return getTimeModeVars(date);
    default:
      return NATURAL_MODE_VARS;
  }
}
