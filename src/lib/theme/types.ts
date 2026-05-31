export type ThemeId =
  | "natural"
  | "cute"
  | "philosophical"
  | "kids"
  | "senior"
  | "minimal-bw"
  | "simple"
  | "gradient"
  | "dark"
  | "japanese";

/** App color theme selected in 画面 settings */
export type ThemeMode = "natural" | "time" | "light" | "dark";

export type ThemeCssVars = Record<string, string>;

export type ThemePreset = {
  id: ThemeId;
  emoji: string;
  nameKey: string;
  vars: ThemeCssVars;
};

export type ThemeSettings = {
  themeMode: ThemeMode;
  /** @deprecated legacy preset id — migrated to themeMode on load */
  themeId?: ThemeId;
  baseColor?: string;
  useCustomBaseColor?: boolean;
};

export const DEFAULT_THEME_MODE: ThemeMode = "natural";
export const THEME_MODES: ThemeMode[] = ["natural", "time", "light", "dark"];

export const DEFAULT_THEME_ID: ThemeId = "natural";
export const DEFAULT_BASE_COLOR = "#7a9e7e";

export const INITIAL_THEME_SETTINGS: ThemeSettings = {
  themeMode: DEFAULT_THEME_MODE,
};

export const THEME_IDS: ThemeId[] = [
  "natural",
  "cute",
  "philosophical",
  "kids",
  "senior",
  "minimal-bw",
  "simple",
  "gradient",
  "dark",
  "japanese",
];
