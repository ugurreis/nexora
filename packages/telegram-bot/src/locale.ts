export type Locale = "tr" | "en";

export function mapWhisperLanguage(raw: string): Locale {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "turkish") return "tr";
  if (normalized === "english") return "en";
  return "tr";
}
