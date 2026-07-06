import { t } from "@lingui/core/macro";
import {
  HiOutlineChartBarSquare,
  HiOutlineLockClosed,
  HiOutlineTrophy,
} from "react-icons/hi2";

import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getAvatarColor } from "~/utils/avatarColor";

function initials(name?: string | null, email?: string) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AnalyticsView() {
  const { workspace } = useWorkspace();
  const { role } = usePermissions();
  const isAdmin = role === "admin";

  const { data = [], isLoading } = api.analytics.teamPerformance.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled:
        isAdmin && !!workspace.publicId && workspace.publicId.length >= 12,
      retry: false,
    },
  );

  const maxScore = Math.max(1, ...data.map((d) => d.score));

  return (
    <>
      <PageHead title={`${t`Ekip Analizi`} | ${workspace.name ?? "Nexora"}`} />
      <div className="relative min-h-full w-full bg-gradient-to-b from-[#dfe9e5] via-[#e7efec] to-[#d8e6e0] dark:from-dark-100 dark:via-dark-50 dark:to-dark-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_480px_at_100%_-8%,rgba(13,148,136,0.16),transparent_60%)]"
        />
        <div className="relative z-[1] m-auto w-full max-w-[1100px] p-6 px-5 md:px-10 md:py-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_4px_12px_-2px_rgba(13,148,136,0.45)]">
              <HiOutlineChartBarSquare className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[1.35rem] font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                {t`Ekip Performans Analizi`}
              </h1>
              <p className="text-sm text-light-900 dark:text-dark-900">
                {t`Yalnızca yöneticilere görünür`}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center ring-1 ring-light-300/70 dark:bg-dark-50 dark:ring-dark-300">
              <HiOutlineLockClosed className="h-8 w-8 text-light-800 dark:text-dark-800" />
              <p className="mt-3 text-sm font-semibold text-light-1000 dark:text-dark-1000">
                {t`Bu sayfa yalnızca yöneticilere açıktır`}
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-light-200 dark:bg-dark-100"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-2px_rgba(16,24,40,0.06),0_16px_36px_-18px_rgba(13,148,136,0.12)] ring-1 ring-light-300/70 dark:bg-dark-50 dark:ring-dark-300">
              <div className="grid grid-cols-[2rem_1fr_5rem_6rem_6rem_8rem] items-center gap-3 border-b border-light-200 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-light-800 dark:border-dark-200 dark:text-dark-800">
                <span>#</span>
                <span>{t`Üye`}</span>
                <span className="text-right">{t`Tamamlanan`}</span>
                <span className="text-right">{t`Zamanında`}</span>
                <span className="text-right">{t`Geciken`}</span>
                <span className="text-right">{t`Skor`}</span>
              </div>

              {data.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-light-900 dark:text-dark-900">
                  {t`Henüz veri yok.`}
                </p>
              )}

              {data.map((m, i) => (
                <div
                  key={m.memberPublicId}
                  className="grid grid-cols-[2rem_1fr_5rem_6rem_6rem_8rem] items-center gap-3 border-b border-light-100 px-5 py-3 last:border-0 dark:border-dark-100"
                >
                  <span className="flex items-center text-sm font-bold text-light-900 dark:text-dark-900">
                    {i === 0 ? (
                      <HiOutlineTrophy className="h-4 w-4 text-amber-500" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarColor(
                          m.email,
                        )}`}
                      >
                        {initials(m.name, m.email)}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-light-1000 dark:text-dark-1000">
                      {m.name ?? m.email}
                    </span>
                  </div>
                  <span className="text-right text-sm font-semibold text-light-1000 dark:text-dark-1000">
                    {m.completed}
                  </span>
                  <span className="text-right text-sm text-light-1000 dark:text-dark-1000">
                    {m.onTimeRate === null ? "—" : `%${m.onTimeRate}`}
                  </span>
                  <span
                    className={`text-right text-sm font-medium ${
                      (m.overdueRate ?? 0) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-light-900 dark:text-dark-900"
                    }`}
                  >
                    {m.overdueRate === null ? "—" : `%${m.overdueRate}`}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-light-200 dark:bg-dark-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${(m.score / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-light-1000 dark:text-dark-1000">
                      {m.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-light-800 dark:text-dark-800">
            {t`Skor = tamamlanan×10 + zamanında oranı − geciken oranı×1.5. Kriterler: tamamlanan kart sayısı, dueDate öncesi biten oranı, geciken oranı.`}
          </p>
        </div>
      </div>
    </>
  );
}
