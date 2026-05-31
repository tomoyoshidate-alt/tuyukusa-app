import { applyFontSizeToDocument, readStoredFontSizeId } from "@/src/lib/fontSizeSettings";
import { getThemeModeVars } from "./modes";
import { getTimePeriod } from "./timeTheme";
import type { ThemeMode, ThemeSettings } from "./types";

const THEME_TRANSITION_CLASS = "tuyukusa-theme-transition";

export function normalizeThemeSettings(data: unknown): ThemeSettings {
  if (!data || typeof data !== "object") {
    return { themeMode: "natural" };
  }
  const d = data as Partial<ThemeSettings> & { themeId?: string };
  const modes: ThemeMode[] = ["natural", "time", "light", "dark"];
  if (d.themeMode && modes.includes(d.themeMode)) {
    return { themeMode: d.themeMode };
  }
  if (d.themeId === "dark") return { themeMode: "dark" };
  if (d.themeId === "simple" || d.themeId === "minimal-bw") return { themeMode: "light" };
  return { themeMode: "natural" };
}

export function buildThemeCssVars(settings: ThemeSettings, date = new Date()): Record<string, string> {
  return getThemeModeVars(settings.themeMode, date);
}

export function applyThemeToDocument(settings: ThemeSettings, date = new Date()): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = buildThemeCssVars(settings, date);
  root.dataset.themeMode = settings.themeMode;
  if (settings.themeMode === "time") {
    root.dataset.timePeriod = getTimePeriod(date);
  } else {
    delete root.dataset.timePeriod;
  }
  root.classList.add(THEME_TRANSITION_CLASS);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  applyFontSizeToDocument(readStoredFontSizeId());
}
