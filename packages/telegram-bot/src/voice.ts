import OpenAI, { toFile } from "openai";

export async function downloadTelegramFile(
  botToken: string,
  fileId: string,
  getFile: (fileId: string) => Promise<{ file_path?: string }>,
): Promise<Buffer> {
  const file = await getFile(fileId);
  if (!file.file_path)
    throw new Error(`Telegram getFile returned no file_path for ${fileId}`);

  const response = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${file.file_path}`,
  );
  if (!response.ok)
    throw new Error(
      `Failed to download Telegram file (status ${response.status})`,
    );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function transcribeVoice(
  openaiApiKey: string,
  audio: Buffer,
): Promise<string> {
  const client = new OpenAI({ apiKey: openaiApiKey });
  const file = await toFile(audio, "voice.ogg", { type: "audio/ogg" });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "tr",
  });

  return transcription.text;
}
