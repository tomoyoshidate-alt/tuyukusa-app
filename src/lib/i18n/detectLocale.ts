export type AppLocale = "ja" | "en" | "zh" | "es" | "pt" | "it" | "fr";

export const APP_LOCALES: AppLocale[] = ["ja", "en", "zh", "es", "pt", "it", "fr"];

export const LOCALE_STORAGE_KEY = "tuyukusa-locale";

export const LOCALE_LABEL_KEYS: Record<AppLocale, string> = {
  ja: "language.ja",
  en: "language.en",
  zh: "language.zh",
  es: "language.es",
  pt: "language.pt",
  it: "language.it",
  fr: "language.fr",
};

export function isAppLocale(value: string): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "ja";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const lang = raw.toLowerCase();
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("it")) return "it";
    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("en")) return "en";
  }
  return "ja";
}

export function readStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isAppLocale(stored)) return stored;
  } catch { /* ignore */ }
  return null;
}

export function writeStoredLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch { /* ignore */ }
}

export function resolveInitialLocale(): AppLocale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function localeToHtmlLang(locale: AppLocale): string {
  switch (locale) {
    case "zh":
      return "zh-Hans";
    default:
      return locale;
  }
}

export function localeToIntl(locale: AppLocale): string {
  switch (locale) {
    case "ja":
      return "ja-JP";
    case "en":
      return "en-US";
    case "zh":
      return "zh-CN";
    case "es":
      return "es-ES";
    case "pt":
      return "pt-BR";
    case "it":
      return "it-IT";
    case "fr":
      return "fr-FR";
  }
}
