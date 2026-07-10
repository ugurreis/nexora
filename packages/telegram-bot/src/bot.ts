import { Bot, InlineKeyboard } from "grammy";

import type { dbClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

import type { WorkerConfig } from "./config";
import { cancelBatch, confirmBatch } from "./confirm";
import { mapWhisperLanguage } from "./locale";
import { handleStart } from "./linking";
import * as telegramLinkRepo from "@kan/db/repository/telegramLink.repo";
import { confirmSummary, t } from "./messages";
import { formatSummary, resolveAndPersist } from "./resolveAndPersist";
import { downloadTelegramFile, transcribeVoice } from "./voice";

const logger = createLogger("telegram-bot");

export function createBot(db: dbClient, config: WorkerConfig): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    if (!token) {
      await ctx.reply(t("startNoToken", null));
      return;
    }

    const chatId = BigInt(ctx.chat.id);
    const result = await handleStart(db, { chatId, token });

    if (result === "linked") {
      await ctx.reply(t("linked", null));
    } else if (result === "invalid-token") {
      await ctx.reply(t("invalidToken", null));
    } else {
      await ctx.reply(t("alreadyLinked", null));
    }
  });

  bot.on("message:voice", async (ctx) => {
    const chatId = BigInt(ctx.chat.id);
    const link = await telegramLinkRepo.getLinkByChatId(db, chatId);
    if (!link) {
      await ctx.reply(t("notLinked", null));
      return;
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await telegramLinkRepo.countPendingBatchesCreatedSince(
      db,
      link.userId,
      since,
    );
    if (recentCount >= config.telegramMaxVoiceMessagesPerHour) {
      await ctx.reply(t("rateLimited", link.locale as "tr" | "en" | null));
      return;
    }

    await ctx.reply(t("listening", link.locale as "tr" | "en" | null));

    try {
      const audio = await downloadTelegramFile(
        config.telegramBotToken,
        ctx.message.voice.file_id,
        (fileId) => bot.api.getFile(fileId),
      );
      const { text: transcript, language: rawLanguage } = await transcribeVoice(
        config.openaiApiKey,
        audio,
      );
      const locale = mapWhisperLanguage(rawLanguage);
      await telegramLinkRepo.updateLocaleByUserId(db, link.userId, locale);

      const result = await resolveAndPersist(db, {
        userId: link.userId,
        transcript,
        anthropicApiKey: config.anthropicApiKey,
      });

      if (!result) {
        await ctx.reply(t("noTaskUnderstood", locale));
        return;
      }

      const keyboard = new InlineKeyboard()
        .text(t("confirmButton", locale), `confirm:${result.batchPublicId}`)
        .text(t("cancelButton", locale), `cancel:${result.batchPublicId}`);

      await ctx.reply(
        `${formatSummary(result.resolved, locale)}\n\n${t("confirmPrompt", locale)}`,
        { reply_markup: keyboard },
      );
    } catch (error) {
      logger.error({ error }, "voice message processing failed");
      await ctx.reply(t("processingFailed", link.locale as "tr" | "en" | null));
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, batchPublicId] = data.split(":");

    if (!batchPublicId || (action !== "confirm" && action !== "cancel")) {
      await ctx.answerCallbackQuery();
      return;
    }

    const chatId = ctx.chat ? BigInt(ctx.chat.id) : null;
    const link = chatId ? await telegramLinkRepo.getLinkByChatId(db, chatId) : undefined;
    const locale = (link?.locale as "tr" | "en" | null) ?? null;

    if (action === "cancel") {
      try {
        const result = await cancelBatch(db, batchPublicId);
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          result.status === "cancelled"
            ? t("cancelled", locale)
            : t("alreadyProcessedOrExpired", locale),
        );
      } catch (error) {
        logger.error({ error }, "cancelBatch failed");
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(t("genericError", locale));
      }
      return;
    }

    try {
      const result = await confirmBatch(db, batchPublicId);
      await ctx.answerCallbackQuery();
      if (result.status !== "confirmed") {
        await ctx.editMessageText(t("alreadyProcessedOrExpired", locale));
        return;
      }

      await ctx.editMessageText(
        confirmSummary(locale, {
          createdCount: result.createdCount,
          inboxCount: result.inboxCount,
          failedCount: result.failedCount,
        }),
      );
    } catch (error) {
      logger.error({ error }, "confirmBatch failed");
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(t("genericError", locale));
    }
  });

  return bot;
}
