"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyFontSizeToDocument,
  DEFAULT_FONT_SIZE_ID,
  normalizeFontSizeId,
  readStoredFontSizeId,
  writeStoredFontSizeId,
  type FontSizeId,
} from "@/src/lib/fontSizeSettings";

type FontSizeContextValue = {
  fontSizeId: FontSizeId;
  setFontSizeId: (id: FontSizeId) => void;
  hydrated: boolean;
};

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSizeId, setFontSizeIdState] = useState<FontSizeId>(DEFAULT_FONT_SIZE_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFontSizeIdState(readStoredFontSizeId());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyFontSizeToDocument(fontSizeId);
    writeStoredFontSizeId(fontSizeId);
  }, [fontSizeId, hydrated]);

  const value = useMemo<FontSizeContextValue>(
    () => ({
      fontSizeId,
      setFontSizeId: setFontSizeIdState,
      hydrated,
    }),
    [fontSizeId, hydrated]
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export function useFontSize(): FontSizeContextValue {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize must be used within FontSizeProvider");
  return ctx;
}

export function reapplyStoredFontSize(): void {
  applyFontSizeToDocument(readStoredFontSizeId());
}
