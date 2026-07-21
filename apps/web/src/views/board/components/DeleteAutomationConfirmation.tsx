import { t } from "@lingui/core/macro";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface DeleteAutomationConfirmationProps {
  boardPublicId: string;
}

export function DeleteAutomationConfirmation({
  boardPublicId,
}: DeleteAutomationConfirmationProps) {
  const {
    closeModal,
    entityId: automationPublicId,
    entityLabel: automationName,
  } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const deleteAutomation = api.boardAutomation.delete.useMutation({
    onSuccess: () => {
      void utils.boardAutomation.list.invalidate({ boardPublicId });
      showPopup({
        header: t`Otomasyon silindi`,
        message: t`Kural başarıyla silindi.`,
        icon: "success",
      });
      closeModal();
    },
    onError: (error) => {
      showPopup({
        header: t`Otomasyon silinemedi`,
        message: error.message || t`Lütfen tekrar deneyin.`,
        icon: "error",
      });
    },
  });

  const handleDelete = () => {
    if (!automationPublicId) return;
    deleteAutomation.mutate({ boardPublicId, automationPublicId });
  };

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Otomasyonu sil`}</h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
            onClick={() => closeModal()}
          aria-label={t`Close`}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <p className="text-sm text-neutral-500 dark:text-dark-900">
          {t`"${automationName}" kuralını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`İptal`}
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={deleteAutomation.isPending}
        >
          {t`Sil`}
        </Button>
      </div>
    </div>
  );
}
