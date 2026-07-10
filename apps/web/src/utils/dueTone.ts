// Son tarih aciliyet rengi — TÜM sitede aynı (kart, kart detayı, pano önizleme).
// geçmiş = kırmızı, ≤3 gün = amber, ileri = emerald (brand).
// Tek kaynak: her yeni yerde kopyalamak yerine bunu import et.
export function dueTone(d: Date): string {
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0)
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  if (days <= 3)
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return "bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
}
