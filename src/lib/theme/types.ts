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

export type ThemeCssVars = Record<string, string>;

export type ThemePreset = {
  id: ThemeId;
  emoji: string;
  nameKey: string;
  vars: ThemeCssVars;
};

export type ThemeSettings = {
  themeId: ThemeId;
  baseColor: string;
  useCustomBaseColor: boolean;
};

export const DEFAULT_THEME_ID: ThemeId = "natural";
export const DEFAULT_BASE_COLOR = "#4a6741";

export const INITIAL_THEME_SETTINGS: ThemeSettings = {
  themeId: DEFAULT_THEME_ID,
  baseColor: DEFAULT_BASE_COLOR,
  useCustomBaseColor: false,
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
