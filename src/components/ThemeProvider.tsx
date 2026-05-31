"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyThemeToDocument, normalizeThemeSettings } from "@/src/lib/theme/applyTheme";
import { INITIAL_THEME_SETTINGS, THEME_MODES, type ThemeMode, type ThemeSettings } from "@/src/lib/theme/types";

const STORAGE_KEY = "tuyukusa-theme";
const TIME_THEME_CHECK_MS = 60_000;

type ThemeContextValue = {
  settings: ThemeSettings;
  setThemeMode: (mode: ThemeMode) => void;
  themeModes: typeof THEME_MODES;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => ({ ...INITIAL_THEME_SETTINGS }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(normalizeThemeSettings(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeToDocument(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode: settings.themeMode }));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated || settings.themeMode !== "time") return;
    const tick = () => applyThemeToDocument(settings);
    const id = window.setInterval(tick, TIME_THEME_CHECK_MS);
    return () => window.clearInterval(id);
  }, [settings, hydrated]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      setThemeMode: mode => setSettings({ themeMode: mode }),
      themeModes: THEME_MODES,
      hydrated,
    }),
    [settings, hydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
