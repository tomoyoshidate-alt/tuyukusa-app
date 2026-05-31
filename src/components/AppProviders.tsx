"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/src/lib/i18n/config";
import {
  localeToHtmlLang,
  resolveInitialLocale,
  writeStoredLocale,
  type AppLocale,
} from "@/src/lib/i18n/detectLocale";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { FontSizeProvider } from "@/src/components/FontSizeProvider";
import StudioPresetsLoader from "@/src/components/StudioPresetsLoader";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const locale = resolveInitialLocale();
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    document.documentElement.lang = localeToHtmlLang(locale);
  }, []);

  useEffect(() => {
    const onChange = (lng: string) => {
      const code = lng.slice(0, 2);
      if (code === "ja" || code === "en" || code === "zh" || code === "es" || code === "pt" || code === "it" || code === "fr") {
        document.documentElement.lang = localeToHtmlLang(code);
      }
    };
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <FontSizeProvider>
          <StudioPresetsLoader />
          {children}
        </FontSizeProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export function changeAppLanguage(locale: AppLocale): void {
  writeStoredLocale(locale);
  void i18n.changeLanguage(locale);
  document.documentElement.lang = localeToHtmlLang(locale);
}
