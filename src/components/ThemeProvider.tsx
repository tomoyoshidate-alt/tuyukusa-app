"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyThemeToDocument, normalizeThemeSettings } from "@/src/lib/theme/applyTheme";
import type { ThemeId, ThemeSettings } from "@/src/lib/theme/types";
import { THEME_PRESETS } from "@/src/lib/theme/presets";

const STORAGE_KEY = "tuyukusa-theme";

type ThemeContextValue = {
  settings: ThemeSettings;
  setThemeId: (id: ThemeId) => void;
  setBaseColor: (color: string) => void;
  setUseCustomBaseColor: (use: boolean) => void;
  presets: typeof THEME_PRESETS;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => normalizeThemeSettings(null));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(normalizeThemeSettings(JSON.parse(raw)));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeToDocument(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings, hydrated]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      setThemeId: id => setSettings(prev => ({ ...prev, themeId: id })),
      setBaseColor: color => setSettings(prev => ({ ...prev, baseColor: color, useCustomBaseColor: true })),
      setUseCustomBaseColor: use => setSettings(prev => ({ ...prev, useCustomBaseColor: use })),
      presets: THEME_PRESETS,
      hydrated,
    }),
    [settings, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
