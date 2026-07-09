import { Bot, InlineKeyboard } from "grammy";

import type { dbClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

import type { WorkerConfig } from "./config";
import { cancelBatch, confirmBatch } from "./confirm";
import { handleStart } from "./linking";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import { formatSummary, resolveAndPersist } from "./resolveAndPersist";
import { downloadTelegramFile, transcribeVoice } from "./voice";

const logger = createLogger("telegram-bot");

export function createBot(db: dbClient, config: WorkerConfig): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    if (!token) {
      await ctx.reply(
        "Nexora ayarlarındaki 'Telegram'a Bağlan' butonundan gelen bağlantıyı kullanmalısın.",
      );
      return;
    }

    const chatId = BigInt(ctx.chat.id);
    const result = await handleStart(db, { chatId, token });

    if (result === "linked") {
      await ctx.reply(
        "Bağlandı! Artık buraya sesli mesaj bırakarak görev oluşturabilirsin.",
      );
    } else if (result === "invalid-token") {
      await ctx.reply(
        "Bu bağlantının süresi dolmuş veya geçersiz. Nexora ayarlarından yeni bir bağlantı üret.",
      );
    } else {
      await ctx.reply(
        "Bu Telegram hesabı zaten başka bir Nexora hesabına bağlı.",
      );
    }
  });

  bot.on("message:voice", async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const link = await telegramLinkRepo.getLinkByChatId(db, chatId);
    if (!link) {
      await ctx.reply(
        "Önce Nexora ayarlarından 'Telegram'a Bağlan' ile hesabını bağlamalısın.",
      );
      return;
    }

    await ctx.reply("Dinliyorum, bir saniye...");

    try {
      const audio = await downloadTelegramFile(
        config.telegramBotToken,
        ctx.message.voice.file_id,
        (fileId) => bot.api.getFile(fileId),
      );
      const transcript = await transcribeVoice(config.openaiApiKey, audio);

      const result = await resolveAndPersist(db, {
        userId: link.userId,
        transcript,
        anthropicApiKey: config.anthropicApiKey,
      });

      if (!result) {
        await ctx.reply("Sesli mesajdan bir görev anlayamadım, tekrar dener misin?");
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("✅ Onayla", `confirm:${result.batchPublicId}`)
        .text("❌ İptal", `cancel:${result.batchPublicId}`);

      await ctx.reply(`${formatSummary(result.resolved)}\n\nOnaylıyor musun?`, {
        reply_markup: keyboard,
      });
    } catch (error) {
      logger.error({ error }, "voice message processing failed");
      await ctx.reply("Sesli komutu işleyemedim, tekrar dener misin?");
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, batchPublicId] = data.split(":");

    if (!batchPublicId || (action !== "confirm" && action !== "cancel")) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (action === "cancel") {
      try {
        const result = await cancelBatch(db, batchPublicId);
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          result.status === "cancelled"
            ? "İptal edildi."
            : "Bu istek zaten işlendi ya da süresi doldu.",
        );
      } catch (error) {
        logger.error({ error }, "cancelBatch failed");
        await ctx.answerCallbackQuery();
        await ctx.editMessageText("Bir hata oluştu, tekrar dener misin?");
      }
      return;
    }

    try {
      const result = await confirmBatch(db, batchPublicId);
      await ctx.answerCallbackQuery();
      if (result.status !== "confirmed") {
        await ctx.editMessageText("Bu istek zaten işlendi ya da süresi doldu.");
        return;
      }

      const failedSuffix =
        result.failedCount > 0 ? `, ${result.failedCount} tanesi başarısız oldu` : "";
      await ctx.editMessageText(
        `${result.createdCount} kart oluşturuldu, ${result.inboxCount} tanesi Gelen Kutusu'na düştü${failedSuffix}.`,
      );
    } catch (error) {
      logger.error({ error }, "confirmBatch failed");
      await ctx.answerCallbackQuery();
      await ctx.editMessageText("Bir hata oluştu, tekrar dener misin?");
    }
  });

  return bot;
}
