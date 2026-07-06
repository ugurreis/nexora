import Link from "next/link";
import { t } from "@lingui/core/macro";
import { motion } from "framer-motion";
import {
  HiCheck,
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineFlag,
  HiOutlinePlus,
} from "react-icons/hi2";

import { api } from "~/utils/api";
import { getAvatarColor } from "~/utils/avatarColor";
import { dueTone } from "~/utils/dueTone";

// Landing'deki pano mockup'ının birebir karşılığı: renkli etiket çubukları +
// kart kodu + atanan avatar(lar) + deadline rozeti + tamamlandı çizgisi.
// Tüm veri board.byId'den gelir (uydurma yok).
const MAX_CARDS = 5;

function initials(name?: string | null, email?: string) {
  const src = name?.trim() || email?.split("@")[0] || "";
  if (!src) return "?";
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDue(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(d);
}

function formatDueFull(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function BoardPreview({
  boardPublicId,
  boardName,
}: {
  boardPublicId: string;
  boardName: string;
}) {
  const { data, isLoading } = api.board.byId.useQuery(
    { boardPublicId },
    { enabled: !!boardPublicId },
  );

  const prefix = data?.workspace.cardPrefix ?? "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-light-300/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-2px_rgba(16,24,40,0.06),0_20px_44px_-20px_rgba(13,148,136,0.16)] dark:bg-dark-50 dark:ring-dark-300"
    >
      <div className="flex items-center justify-between border-b border-light-200/80 px-5 py-3.5 dark:border-dark-200">
        {/* Proje adı + teslim tarihi + ekip = tek grup (deadline'ın bu
            projeye ait olduğu net olsun diye ada bitişik). */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-light-1000 dark:text-dark-1000">
              {boardName}
            </h2>
          </div>

          {data?.dueDate && (
            <span
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${dueTone(
                new Date(data.dueDate),
              )}`}
              title={t`Bu projenin teslim tarihi`}
            >
              <HiOutlineFlag className="h-3.5 w-3.5" />
              {t`Proje teslimi`}: {formatDueFull(new Date(data.dueDate))}
            </span>
          )}

          {data?.members && data.members.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-light-800 dark:text-dark-800">
                {t`Ekip`}
              </span>
              <span className="flex -space-x-1.5">
                {data.members.slice(0, 4).map((m) =>
                  m.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.publicId}
                      src={m.user.image}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-dark-50"
                      title={m.user.name ?? m.email}
                    />
                  ) : (
                    <span
                      key={m.publicId}
                      title={m.user?.name ?? m.email}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-dark-50 ${getAvatarColor(m.email)}`}
                    >
                      {initials(m.user?.name, m.email)}
                    </span>
                  ),
                )}
              </span>
            </span>
          )}
        </div>

        <Link
          href={`boards/${boardPublicId}`}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
        >
          {t`Panoyu aç`}
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto bg-gradient-to-b from-transparent to-light-100/40 p-4 dark:to-dark-100/40">
        {isLoading &&
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 w-64 shrink-0 animate-pulse rounded-2xl bg-light-200 dark:bg-dark-100"
            />
          ))}

        {!isLoading && (data?.lists.length ?? 0) === 0 && (
          <div className="w-full py-10 text-center text-sm text-light-900 dark:text-dark-900">
            {t`Bu panoda henüz liste yok.`}
          </div>
        )}

        {!isLoading &&
          data?.lists.map((list) => (
            <div
              key={list.publicId}
              className="flex w-64 shrink-0 flex-col rounded-2xl bg-gradient-to-b from-light-200/70 to-light-100/50 p-3 ring-1 ring-inset ring-white/40 dark:from-dark-100/70 dark:to-dark-100/40 dark:ring-white/5"
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                <span className="text-[13px] font-semibold text-light-1000 dark:text-dark-1000">
                  {list.name}
                </span>
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-light-950 shadow-sm dark:bg-dark-50 dark:text-dark-900">
                  {list.cards.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {list.cards.slice(0, MAX_CARDS).map((card) => (
                  <div
                    key={card.publicId}
                    className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.10)] ring-1 ring-light-200/80 dark:bg-dark-50 dark:ring-dark-300"
                  >
                    {card.labels.length > 0 && (
                      <div className="mb-2 flex gap-1">
                        {card.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.publicId}
                            className="h-1.5 w-7 rounded-full"
                            style={{
                              backgroundColor: label.colourCode ?? "#cbd5e1",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <p
                      className={`text-[13px] font-medium leading-snug ${
                        card.completed
                          ? "text-light-800 line-through dark:text-dark-800"
                          : "text-light-1000 dark:text-dark-1000"
                      }`}
                    >
                      <span className="line-clamp-2">{card.title}</span>
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="shrink-0 text-[11px] font-medium text-light-800 dark:text-dark-800">
                          {card.completed && (
                            <HiCheck className="mr-0.5 inline h-3 w-3 text-brand-600 dark:text-brand-400" />
                          )}
                          {card.cardNumber ? `${prefix}-${card.cardNumber}` : ""}
                        </span>
                        {card.dueDate && (
                          <span
                            className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${dueTone(
                              new Date(card.dueDate),
                            )}`}
                          >
                            <HiOutlineCalendarDays className="h-3 w-3" />
                            {formatDue(new Date(card.dueDate))}
                          </span>
                        )}
                      </div>

                      {card.members.length > 0 && (
                        <div className="flex shrink-0 -space-x-1.5">
                          {card.members.slice(0, 3).map((m) =>
                            m.user?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={m.publicId}
                                src={m.user.image}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover ring-2 ring-white dark:ring-dark-50"
                              />
                            ) : (
                              <span
                                key={m.publicId}
                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white dark:ring-dark-50 ${getAvatarColor(m.email)}`}
                              >
                                {initials(m.user?.name, m.email)}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {list.cards.length === 0 && (
                  <p className="px-1 py-2 text-[12px] text-light-800 dark:text-dark-800">
                    {t`Boş`}
                  </p>
                )}

                {list.cards.length > MAX_CARDS && (
                  <p className="px-1 pt-1 text-[12px] font-medium text-light-900 dark:text-dark-900">
                    {t`+${list.cards.length - MAX_CARDS} kart daha`}
                  </p>
                )}
              </div>
            </div>
          ))}

        {!isLoading && (data?.lists.length ?? 0) > 0 && (
          <Link
            href={`boards/${boardPublicId}`}
            className="flex w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-light-400 text-light-800 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-dark-400 dark:text-dark-800"
          >
            <HiOutlinePlus className="h-5 w-5" />
            <span className="text-xs font-medium">{t`Panoda düzenle`}</span>
          </Link>
        )}
      </div>
    </motion.section>
  );
}
