import type { Messages } from "@lingui/core";
import { i18n } from "@lingui/core";

import type { Locale } from "~/locales";
import { defaultLocale } from "~/locales";
import { messages as trMessages } from "~/locales/tr/messages";

// Yalnızca varsayılan dil, ilk boyamadan (hydration öncesi) önce senkron
// gerekir; bu yüzden statik import edilir. Diğer tüm diller lazy yüklenir.
// defaultLocale değişirse, yeni varsayılanın kataloğunu buraya ekle; aksi
// halde initializeI18n aşağıda yanlış dili yüklemek yerine hata fırlatır.
const eagerMessages: Partial<Record<Locale, Messages>> = {
  tr: trMessages,
};

const loadMessages = async (locale: Locale): Promise<Messages> => {
  const eager = eagerMessages[locale];
  if (eager) return eager;

  switch (locale) {
    case "en":
      return (await import("~/locales/en/messages")).messages;
    case "fr":
      return (await import("~/locales/fr/messages")).messages;
    case "de":
      return (await import("~/locales/de/messages")).messages;
    case "es":
      return (await import("~/locales/es/messages")).messages;
    case "it":
      return (await import("~/locales/it/messages")).messages;
    case "nl":
      return (await import("~/locales/nl/messages")).messages;
    case "ru":
      return (await import("~/locales/ru/messages")).messages;
    case "pl":
      return (await import("~/locales/pl/messages")).messages;
    case "ptbr":
      return (await import("~/locales/ptbr/messages")).messages;
    default:
      return (await import("~/locales/en/messages")).messages;
  }
};

let isInitialized = false;
const loadedLocales = new Set<string>();

export function initializeI18n() {
  if (!isInitialized) {
    const defaultMessages = eagerMessages[defaultLocale];
    if (!defaultMessages) {
      throw new Error(
        `i18n: defaultLocale "${defaultLocale}" için senkron katalog yok; ` +
          `utils/i18n.ts içindeki eagerMessages'e statik import ekle.`,
      );
    }
    i18n.load(defaultLocale, defaultMessages);
    i18n.activate(defaultLocale);
    loadedLocales.add(defaultLocale);
    isInitialized = true;
  }

  return i18n;
}

export async function activateLocale(locale: Locale) {
  if (!loadedLocales.has(locale)) {
    const messages = await loadMessages(locale);
    i18n.load(locale, messages);
    loadedLocales.add(locale);
  }

  i18n.activate(locale);
  return i18n;
}

initializeI18n();

export { i18n };
