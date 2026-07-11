import { t } from "@lingui/core/macro";
import { HiOutlineTrash, HiSparkles } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";

interface AutomationsModalProps {
  boardPublicId: string;
}

export function AutomationsModal({ boardPublicId }: AutomationsModalProps) {
  const { closeModal, openModal } = useModal();
  const { data: automations, isLoading } = api.boardAutomation.list.useQuery({
    boardPublicId,
  });

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-2 text-neutral-900 dark:text-dark-1000">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <HiSparkles className="h-4 w-4" />
            {t`Otomasyonlar`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
            onClick={() => closeModal()}
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-500 dark:text-dark-900">
          {t`Bir kart belirli bir listeye taşındığında otomatik olarak etiket ekleyin veya üye atayın.`}
        </p>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openModal("NEW_AUTOMATION")}
        >
          {t`Kural ekle`}
        </Button>

        <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pb-4">
          {!isLoading && (!automations || automations.length === 0) && (
            <p className="rounded-md border border-light-300 p-4 text-center text-sm text-light-700 dark:border-dark-300 dark:text-dark-800">
              {t`Henüz otomasyon kuralı yok.`}
            </p>
          )}

          {automations?.map((rule) => {
            const actionTargetName =
              rule.actionType === "card.add_label"
                ? (rule.actionLabel?.name ?? "")
                : (rule.actionMember?.name ?? t`Bir üye`);

            return (
            <div
              key={rule.publicId}
              className="flex items-center justify-between rounded-md border border-light-300 px-3 py-2 dark:border-dark-300"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-light-1000 dark:text-dark-1000">
                  {rule.name}
                </p>
                <p className="truncate text-xs text-light-700 dark:text-dark-800">
                  {rule.actionType === "card.add_label"
                    ? t`"${rule.triggerList.name}" listesine taşınınca "${actionTargetName}" etiketini ekle`
                    : t`"${rule.triggerList.name}" listesine taşınınca ${actionTargetName} üyesine ata`}
                </p>
              </div>
              <button
                type="button"
                className="ml-2 shrink-0 rounded p-1.5 text-light-700 hover:bg-light-200 hover:text-red-600 dark:text-dark-800 dark:hover:bg-dark-200"
                onClick={() =>
                  openModal("DELETE_AUTOMATION", rule.publicId, rule.name)
                }
                aria-label={t`Sil`}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
