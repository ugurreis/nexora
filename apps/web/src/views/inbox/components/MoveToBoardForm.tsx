import { useState } from "react";
import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function MoveToBoardForm() {
  const { entityId, closeModal } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();

  const [boardPublicId, setBoardPublicId] = useState("");
  const [listPublicId, setListPublicId] = useState("");

  const { data: boards = [] } = api.board.all.useQuery(
    { workspacePublicId: workspace.publicId, type: "regular" },
    { enabled: !!workspace.publicId },
  );

  const { data: board } = api.board.byId.useQuery(
    { boardPublicId },
    { enabled: !!boardPublicId },
  );

  const convert = api.inbox.convertToCard.useMutation({
    onSuccess: async () => {
      closeModal();
      await utils.inbox.list.invalidate();
      showPopup({
        header: t`Moved to board`,
        message: t`The item is now a card.`,
        icon: "success",
      });
    },
    onError: () =>
      showPopup({
        header: t`Could not move item`,
        message: t`Please try again.`,
        icon: "error",
      }),
  });

  const lists = board?.allLists ?? [];

  return (
    <div className="p-5">
      <h2 className="mb-4 text-sm font-bold text-neutral-900 dark:text-dark-1000">
        {t`Move to board`}
      </h2>

      <label
        htmlFor="move-inbox-item-board"
        className="mb-1 block text-xs text-neutral-500 dark:text-dark-900"
      >
        {t`Board`}
      </label>
      <select
        id="move-inbox-item-board"
        aria-label={t`Board`}
        value={boardPublicId}
        onChange={(e) => {
          setBoardPublicId(e.target.value);
          setListPublicId("");
        }}
        className="mb-4 w-full rounded-md border border-light-300 bg-transparent px-2 py-2 text-sm dark:border-dark-300"
      >
        <option value="">{t`Select a board`}</option>
        {boards.map((b) => (
          <option key={b.publicId} value={b.publicId}>
            {b.name}
          </option>
        ))}
      </select>

      <label
        htmlFor="move-inbox-item-list"
        className="mb-1 block text-xs text-neutral-500 dark:text-dark-900"
      >
        {t`List`}
      </label>
      <select
        id="move-inbox-item-list"
        aria-label={t`List`}
        value={listPublicId}
        onChange={(e) => setListPublicId(e.target.value)}
        disabled={!boardPublicId}
        className="mb-6 w-full rounded-md border border-light-300 bg-transparent px-2 py-2 text-sm dark:border-dark-300"
      >
        <option value="">{t`Select a list`}</option>
        {lists.map((l) => (
          <option key={l.publicId} value={l.publicId}>
            {l.name}
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button
          disabled={!listPublicId || !entityId}
          isLoading={convert.isPending}
          onClick={() =>
            entityId && convert.mutate({ publicId: entityId, listPublicId })
          }
        >
          {t`Move`}
        </Button>
      </div>
    </div>
  );
}
