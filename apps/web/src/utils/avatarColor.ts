// Tek kişi = tek renk, TÜM sitede aynı. Tohum daima e-posta (en stabil kimlik).
// Her avatar render'ı bunu email ile çağırmalı; publicId/name gibi bağlama göre
// değişen tohumlar KULLANILMAMALI (aksi halde aynı kişi farklı renkte görünür).
const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-emerald-500",
];

export function getAvatarColor(seed: string | null | undefined): string {
  const s = (seed ?? "").trim().toLowerCase() || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-brand-500";
}
