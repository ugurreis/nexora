import type { Locale } from "./locale";

export type { Locale };

export const messages = {
  startNoToken: {
    tr: "Nexora ayarlarındaki 'Telegram'a Bağlan' butonundan gelen bağlantıyı kullanmalısın.",
    en: "Please use the link from the 'Connect Telegram' button in your Nexora settings.",
  },
  linked: {
    tr: "Bağlandı! Artık buraya sesli mesaj bırakarak görev oluşturabilirsin.",
    en: "Connected! You can now create tasks by leaving a voice message here.",
  },
  invalidToken: {
    tr: "Bu bağlantının süresi dolmuş veya geçersiz. Nexora ayarlarından yeni bir bağlantı üret.",
    en: "This link has expired or is invalid. Generate a new one from your Nexora settings.",
  },
  alreadyLinked: {
    tr: "Bu Telegram hesabı zaten başka bir Nexora hesabına bağlı.",
    en: "This Telegram account is already connected to another Nexora account.",
  },
  notLinked: {
    tr: "Önce Nexora ayarlarından 'Telegram'a Bağlan' ile hesabını bağlamalısın.",
    en: "Please connect your account first via 'Connect Telegram' in your Nexora settings.",
  },
  rateLimited: {
    tr: "Bu saat için sesli komut limitine ulaştın, biraz sonra tekrar dener misin?",
    en: "You've reached the hourly voice-command limit — please try again a bit later.",
  },
  listening: {
    tr: "Dinliyorum, bir saniye...",
    en: "Listening, one moment...",
  },
  noTaskUnderstood: {
    tr: "Sesli mesajdan bir görev anlayamadım, tekrar dener misin?",
    en: "I couldn't understand a task from that voice message — could you try again?",
  },
  confirmPrompt: {
    tr: "Onaylıyor musun?",
    en: "Do you confirm?",
  },
  processingFailed: {
    tr: "Sesli komutu işleyemedim, tekrar dener misin?",
    en: "I couldn't process that voice command — could you try again?",
  },
  confirmButton: { tr: "✅ Onayla", en: "✅ Confirm" },
  cancelButton: { tr: "❌ İptal", en: "❌ Cancel" },
  cancelled: { tr: "İptal edildi.", en: "Cancelled." },
  alreadyProcessedOrExpired: {
    tr: "Bu istek zaten işlendi ya da süresi doldu.",
    en: "This request was already processed or has expired.",
  },
  genericError: {
    tr: "Bir hata oluştu, tekrar dener misin?",
    en: "Something went wrong — could you try again?",
  },
  inboxLabel: { tr: "Gelen Kutusu", en: "Inbox" },
  boardSuffix: { tr: "panosu", en: "board" },
} as const satisfies Record<string, Record<Locale, string>>;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, locale: Locale | null): string {
  return messages[key][locale ?? "tr"];
}

export function confirmSummary(
  locale: Locale | null,
  input: { createdCount: number; inboxCount: number; failedCount: number },
): string {
  const resolved = locale ?? "tr";
  const failedSuffix =
    input.failedCount > 0
      ? resolved === "tr"
        ? `, ${input.failedCount} tanesi başarısız oldu`
        : `, ${input.failedCount} failed`
      : "";

  if (resolved === "tr") {
    return `${input.createdCount} kart oluşturuldu, ${input.inboxCount} tanesi Gelen Kutusu'na düştü${failedSuffix}.`;
  }
  return `${input.createdCount} card(s) created, ${input.inboxCount} sent to Inbox${failedSuffix}.`;
}
