import Anthropic from "@anthropic-ai/sdk";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

import { getRedisClient } from "@kan/db/redis";

export function isAiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const redis = getRedisClient();
const aiDescriptionRateLimiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      points: 20,
      duration: 60 * 60,
      keyPrefix: "ai_description",
    })
  : new RateLimiterMemory({
      points: 20,
      duration: 60 * 60,
      keyPrefix: "ai_description",
    });

export async function consumeAiDescriptionQuota(userId: string) {
  await aiDescriptionRateLimiter.consume(userId);
}

export async function generateCardDescription(input: {
  title: string;
  existingDescription: string | null;
  labels: string[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system:
      "Sen bir görev kartı asistanısın. Kart başlığından ve (varsa) mevcut açıklamadan yola çıkarak kısa, net, aksiyon odaklı bir açıklama üret. Türkçe yaz, gerekirse madde işaretleri kullan. Sadece açıklama metnini döndür, başka açıklama ekleme.",
    messages: [
      {
        role: "user",
        content: `Başlık: ${input.title}\nEtiketler: ${input.labels.join(", ") || "yok"}\nMevcut açıklama: ${input.existingDescription || "(boş)"}`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Empty AI response");

  return block.text.trim();
}
