import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import en from "../locales/en.json";
import zhTW from "../locales/zh-TW.json";
import zhCN from "../locales/zh-CN.json";

const resources = {
  en: {
    translation: en,
  },
  "zh-TW": {
    translation: zhTW,
  },
  "zh-CN": {
    translation: zhCN,
  },
};

i18n
  // .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",

    // Language detection options
    // detection: {
    //   order: ["localStorage", "navigator", "htmlTag"],
    //   lookupLocalStorage: "i18nextLng",
    //   caches: ["localStorage"],
    // },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React i18next options
    react: {
      useSuspense: false,
    },
  });

export default i18n;
