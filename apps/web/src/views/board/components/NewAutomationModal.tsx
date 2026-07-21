import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { formatMemberDisplayName } from "~/utils/helpers";

interface NewAutomationModalProps {
  boardPublicId: string;
}

export function NewAutomationModal({ boardPublicId }: NewAutomationModalProps) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const { data: board } = api.board.byId.useQuery({ boardPublicId });

  const [name, setName] = useState("");
  const [triggerListPublicId, setTriggerListPublicId] = useState("");
  const [actionType, setActionType] = useState<"card.add_label" | "card.assign_member">(
    "card.add_label",
  );
  const [actionLabelPublicId, setActionLabelPublicId] = useState("");
  const [actionMemberPublicId, setActionMemberPublicId] = useState("");

  const createAutomation = api.boardAutomation.create.useMutation({
    onSuccess: () => {
      void utils.boardAutomation.list.invalidate({ boardPublicId });
      showPopup({
        header: t`Otomasyon oluşturuldu`,
        message: t`Kural başarıyla oluşturuldu.`,
        icon: "success",
      });
      closeModal();
    },
    onError: (error) => {
      showPopup({
        header: t`Otomasyon oluşturulamadı`,
        message: error.message || t`Lütfen tekrar deneyin.`,
        icon: "error",
      });
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    triggerListPublicId.length > 0 &&
    (actionType === "card.add_label"
      ? actionLabelPublicId.length > 0
      : actionMemberPublicId.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    createAutomation.mutate({
      boardPublicId,
      name: name.trim(),
      triggerListPublicId,
      actionType,
      actionLabelPublicId:
        actionType === "card.add_label" ? actionLabelPublicId : undefined,
      actionMemberPublicId:
        actionType === "card.assign_member" ? actionMemberPublicId : undefined,
    });
  };

  const selectClass =
    "w-full rounded-md border border-light-300 bg-transparent px-3 py-2 text-sm text-light-1000 dark:border-dark-300 dark:text-dark-1000";

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Yeni otomasyon`}</h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
            onClick={() => closeModal()}
          aria-label={t`Close`}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <div className="space-y-4 pb-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-light-800 dark:text-dark-800">
              {t`Kural adı`}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t`örn. Test listesine taşınınca Acil ekle`}
              className={selectClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-light-800 dark:text-dark-800">
              {t`Bir kart bu listeye taşındığında...`}
            </label>
            <select
              value={triggerListPublicId}
              onChange={(e) => setTriggerListPublicId(e.target.value)}
              className={selectClass}
            >
              <option value="">{t`Liste seçin`}</option>
              {board?.allLists.map((list) => (
                <option key={list.publicId} value={list.publicId}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-light-800 dark:text-dark-800">
              {t`Şunu yap:`}
            </label>
            <select
              value={actionType}
              onChange={(e) =>
                setActionType(e.target.value as "card.add_label" | "card.assign_member")
              }
              className={selectClass}
            >
              <option value="card.add_label">{t`Etiket ekle`}</option>
              <option value="card.assign_member">{t`Üye ata`}</option>
            </select>
          </div>

          {actionType === "card.add_label" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-light-800 dark:text-dark-800">
                {t`Etiket`}
              </label>
              <select
                value={actionLabelPublicId}
                onChange={(e) => setActionLabelPublicId(e.target.value)}
                className={selectClass}
              >
                <option value="">{t`Etiket seçin`}</option>
                {board?.labels.map((label) => (
                  <option key={label.publicId} value={label.publicId}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-light-800 dark:text-dark-800">
                {t`Üye`}
              </label>
              <select
                value={actionMemberPublicId}
                onChange={(e) => setActionMemberPublicId(e.target.value)}
                className={selectClass}
              >
                <option value="">{t`Üye seçin`}</option>
                {board?.workspace.members.map((member) => (
                  <option key={member.publicId} value={member.publicId}>
                    {formatMemberDisplayName(
                      member.user?.name ?? null,
                      member.user?.email ?? member.email,
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`İptal`}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={createAutomation.isPending}
        >
          {t`Oluştur`}
        </Button>
      </div>
    </div>
  );
}
