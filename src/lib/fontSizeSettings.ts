export type FontSizeId = "small" | "standard" | "large" | "xlarge";

export const FONT_SIZE_STORAGE_KEY = "tuyukusa-font-size";

export const DEFAULT_FONT_SIZE_ID: FontSizeId = "standard";

export const FONT_SIZE_IDS: FontSizeId[] = ["small", "standard", "large", "xlarge"];

export type FontSizeScale = {
  sm: string;
  base: string;
  lg: string;
  xl: string;
  btn: string;
  heading: string;
};

/** sm=ラベル, base=本文, lg=小見出し, xl=大見出し, btn=ボタン, heading=セクション見出し */
export const FONT_SIZE_PRESETS: Record<FontSizeId, FontSizeScale> = {
  small: {
    sm: "10px",
    base: "12px",
    lg: "13px",
    xl: "16px",
    btn: "12px",
    heading: "14px",
  },
  standard: {
    sm: "11px",
    base: "13px",
    lg: "15px",
    xl: "18px",
    btn: "13px",
    heading: "15px",
  },
  large: {
    sm: "13px",
    base: "16px",
    lg: "18px",
    xl: "22px",
    btn: "16px",
    heading: "18px",
  },
  xlarge: {
    sm: "15px",
    base: "19px",
    lg: "22px",
    xl: "26px",
    btn: "19px",
    heading: "22px",
  },
};

export const FONT_SIZE_I18N_KEYS: Record<FontSizeId, string> = {
  small: "fontSize.small",
  standard: "fontSize.standard",
  large: "fontSize.large",
  xlarge: "fontSize.xlarge",
};

export function normalizeFontSizeId(value: unknown): FontSizeId {
  if (typeof value === "string" && FONT_SIZE_IDS.includes(value as FontSizeId)) {
    return value as FontSizeId;
  }
  return DEFAULT_FONT_SIZE_ID;
}

export function readStoredFontSizeId(): FontSizeId {
  if (typeof localStorage === "undefined") return DEFAULT_FONT_SIZE_ID;
  try {
    const raw = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (!raw) return DEFAULT_FONT_SIZE_ID;
    return normalizeFontSizeId(JSON.parse(raw));
  } catch {
    return normalizeFontSizeId(localStorage.getItem(FONT_SIZE_STORAGE_KEY));
  }
}

export function writeStoredFontSizeId(id: FontSizeId): void {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, JSON.stringify(id));
  } catch { /* ignore */ }
}

export function buildFontSizeCssVars(id: FontSizeId): Record<string, string> {
  const scale = FONT_SIZE_PRESETS[id] ?? FONT_SIZE_PRESETS.standard;
  return {
    "--t-font-size-sm": scale.sm,
    "--t-font-size-base": scale.base,
    "--t-font-size-lg": scale.lg,
    "--t-font-size-xl": scale.xl,
    "--t-font-size-btn": scale.btn,
    "--t-font-size-heading": scale.heading,
  };
}

export function applyFontSizeToDocument(id: FontSizeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = buildFontSizeCssVars(id);
  root.dataset.fontSize = id;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
