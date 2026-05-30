import { applyFontSizeToDocument, readStoredFontSizeId } from "@/src/lib/fontSizeSettings";
import { derivePaletteFromBase } from "./colorUtils";
import { getThemePreset } from "./presets";
import type { ThemeId, ThemeSettings } from "./types";

export function normalizeThemeSettings(data: unknown): ThemeSettings {
  if (!data || typeof data !== "object") {
    return { themeId: "natural", baseColor: "#4a6741", useCustomBaseColor: false };
  }
  const d = data as Partial<ThemeSettings>;
  const validIds: ThemeId[] = [
    "natural", "cute", "philosophical", "kids", "senior",
    "minimal-bw", "simple", "gradient", "dark", "japanese",
  ];
  const themeId = validIds.includes(d.themeId as ThemeId) ? (d.themeId as ThemeId) : "natural";
  return {
    themeId,
    baseColor: typeof d.baseColor === "string" && /^#[0-9a-fA-F]{6}$/.test(d.baseColor) ? d.baseColor : "#4a6741",
    useCustomBaseColor: d.useCustomBaseColor === true,
  };
}

export function buildThemeCssVars(settings: ThemeSettings): Record<string, string> {
  const preset = getThemePreset(settings.themeId);
  const vars = { ...preset.vars };
  if (settings.useCustomBaseColor) {
    Object.assign(vars, derivePaletteFromBase(settings.baseColor));
  }
  return vars;
}

export function applyThemeToDocument(settings: ThemeSettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = buildThemeCssVars(settings);
  root.dataset.theme = settings.themeId;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  applyFontSizeToDocument(readStoredFontSizeId());
}
