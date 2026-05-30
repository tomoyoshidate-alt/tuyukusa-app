import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import it from "./locales/it";
import ja from "./locales/ja";
import pt from "./locales/pt";
import zh from "./locales/zh";
import { resolveInitialLocale } from "./detectLocale";

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  pt: { translation: pt },
  it: { translation: it },
  fr: { translation: fr },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: typeof window === "undefined" ? "ja" : resolveInitialLocale(),
  fallbackLng: "ja",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
