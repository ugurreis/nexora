import Link from "next/link";
import { t } from "@lingui/core/macro";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendarDays,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { PageHead } from "~/components/PageHead";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

// Her pano sabit bir renge sahip olur (publicId tohumlu), böylece takvimde
// hangi kartın hangi panoya ait olduğu tek bakışta ayırt edilir.
const BOARD_CHIP_STYLES = [
  { border: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-900 dark:text-violet-300", hoverBg: "hover:bg-violet-100 dark:hover:bg-violet-500/20" },
  { border: "border-sky-500", bg: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-900 dark:text-sky-300", hoverBg: "hover:bg-sky-100 dark:hover:bg-sky-500/20" },
  { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-900 dark:text-amber-300", hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-500/20" },
  { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-900 dark:text-emerald-300", hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-500/20" },
  { border: "border-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-900 dark:text-rose-300", hoverBg: "hover:bg-rose-100 dark:hover:bg-rose-500/20" },
  { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-900 dark:text-teal-300", hoverBg: "hover:bg-teal-100 dark:hover:bg-teal-500/20" },
  { border: "border-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-900 dark:text-indigo-300", hoverBg: "hover:bg-indigo-100 dark:hover:bg-indigo-500/20" },
];

function boardChipStyle(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return BOARD_CHIP_STYLES[Math.abs(h) % BOARD_CHIP_STYLES.length]!;
}

export default function CalendarView() {
  const { workspace } = useWorkspace();
  const { dateLocale } = useLocalisation();
  const [cursor, setCursor] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  // The rendered grid depends on the user's locale (week start day, weekday
  // labels, month name), which is only known client-side — rendering it
  // during SSR causes a hydration mismatch, so we wait until mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: cards = [], isLoading } = api.card.calendar.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  const cardsByDay = useMemo(() => {
    const map = new Map<string, typeof cards>();
    for (const card of cards) {
      const key = format(card.dueDate, "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) existing.push(card);
      else map.set(key, [card]);
    }
    return map;
  }, [cards]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { locale: dateLocale });
    const end = endOfWeek(endOfMonth(cursor), { locale: dateLocale });
    return eachDayOfInterval({ start, end });
  }, [cursor, dateLocale]);

  if (!mounted) {
    return (
      <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-[#dfe9e5] via-[#e7efec] to-[#d8e6e0] dark:from-dark-100 dark:via-dark-50 dark:to-dark-100">
        <PageHead title={t`Takvim`} />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="h-11 w-40 animate-pulse rounded-xl bg-light-300 dark:bg-dark-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-[#dfe9e5] via-[#e7efec] to-[#d8e6e0] dark:from-dark-100 dark:via-dark-50 dark:to-dark-100">
      <PageHead title={t`Takvim`} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_480px_at_100%_-8%,rgba(13,148,136,0.16),transparent_60%)]"
      />
      <div className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_4px_12px_-2px_rgba(13,148,136,0.45)]">
              <HiOutlineCalendarDays className="h-6 w-6" />
            </span>
            <h1 className="text-[1.35rem] font-bold capitalize tracking-tight text-light-1000 dark:text-dark-1000">
              {format(cursor, "MMMM yyyy", { locale: dateLocale })}
            </h1>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/70 p-1 shadow-sm ring-1 ring-light-300/70 dark:bg-dark-100/70 dark:ring-dark-300">
            <button
              type="button"
              onClick={() => setCursor((prev) => subMonths(prev, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-light-900 transition-colors hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
              aria-label={t`Önceki ay`}
            >
              <HiChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-light-900 transition-colors hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
            >
              {t`Bugün`}
            </button>
            <button
              type="button"
              onClick={() => setCursor((prev) => addMonths(prev, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-light-900 transition-colors hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
              aria-label={t`Sonraki ay`}
            >
              <HiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-2px_rgba(16,24,40,0.06),0_16px_36px_-18px_rgba(13,148,136,0.12)] ring-1 ring-light-300/70 dark:bg-dark-50 dark:ring-dark-300">
          <div className="grid grid-cols-7 border-b border-light-200 dark:border-dark-200">
            {days.slice(0, 7).map((day) => (
              <div
                key={`weekday-${day.toISOString()}`}
                className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-light-800 dark:text-dark-800"
              >
                {format(day, "EEEEEE", { locale: dateLocale })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const key = format(day, "yyyy-MM-dd");
              const dayCards = cardsByDay.get(key) ?? [];
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={twMerge(
                    "min-h-[112px] border-b border-r border-light-200 p-1.5 transition-colors dark:border-dark-200",
                    (index + 1) % 7 === 0 && "border-r-0",
                    !isSameMonth(day, cursor)
                      ? "bg-light-100/60 dark:bg-dark-100/40"
                      : "bg-white hover:bg-light-100/60 dark:bg-dark-50 dark:hover:bg-dark-100/60",
                    today && "bg-brand-500/[0.06] dark:bg-brand-500/[0.08]",
                  )}
                >
                  <p
                    className={twMerge(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      !isSameMonth(day, cursor)
                        ? "text-light-700 dark:text-dark-700"
                        : "text-light-900 dark:text-dark-900",
                      today &&
                        "bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_2px_6px_-1px_rgba(13,148,136,0.5)]",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                  <div className="space-y-1">
                    {dayCards.map((card) => {
                      const style = boardChipStyle(card.boardPublicId);
                      return (
                        <Link
                          key={card.publicId}
                          href={`/cards/${card.publicId}`}
                          className={twMerge(
                            "block truncate rounded-md border-l-[3px] px-1.5 py-1 text-xs font-medium shadow-sm transition-all hover:translate-x-0.5 hover:shadow-md",
                            style.border,
                            style.bg,
                            style.text,
                            style.hoverBg,
                            card.completed && "opacity-50 line-through",
                          )}
                          title={`${card.boardName} · ${card.listName} · ${card.title}`}
                        >
                          {card.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isLoading && cards.length === 0 && (
          <p className="mt-6 text-center text-sm text-light-700 dark:text-dark-800">
            {t`Bitiş tarihi atanmış kart yok.`}
          </p>
        )}
      </div>
    </div>
  );
}
