import { useState } from "react";
import { t } from "@lingui/core/macro";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import InboxItemRow from "./components/InboxItemRow";

export default function InboxView() {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { openModal } = useModal();
  const [title, setTitle] = useState("");

  const { data: items = [], isLoading } = api.inbox.list.useQuery();
  const { data: inboxEmail } = api.user.getInboxEmail.useQuery();

  const invalidate = () => utils.inbox.list.invalidate();

  const add = api.inbox.add.useMutation({
    onSuccess: async () => {
      setTitle("");
      await invalidate();
    },
    onError: () =>
      showPopup({
        header: t`Could not add item`,
        message: t`Please try again.`,
        icon: "error",
      }),
  });

  const update = api.inbox.update.useMutation({ onSuccess: invalidate });
  const remove = api.inbox.delete.useMutation({ onSuccess: invalidate });

  const isBusy = add.isPending || update.isPending || remove.isPending;

  const submit = () => {
    const next = title.trim();
    if (next) add.mutate({ title: next });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-lg font-bold text-neutral-900 dark:text-dark-1000">
        {t`Inbox`}
      </h1>

      <input
        aria-label={t`Add to inbox`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={t`Add to inbox…`}
        className="mb-6 w-full rounded-md border border-light-300 bg-transparent px-3 py-2 text-sm dark:border-dark-300"
      />

      {isLoading ? (
        <p className="text-sm text-neutral-500 dark:text-dark-900">{t`Loading…`}</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-light-300 p-6 text-center text-sm text-neutral-500 dark:border-dark-300 dark:text-dark-900">
          <p>{t`Your inbox is empty.`}</p>
          {inboxEmail ? (
            <p className="mt-2">
              {t`Tip: you can also add items by emailing`}{" "}
              <span className="font-mono">{inboxEmail.email}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <ul role="list">
          {items.map((item) => (
            <InboxItemRow
              key={item.publicId}
              publicId={item.publicId}
              title={item.title}
              description={item.description}
              dueDate={item.dueDate}
              source={item.source}
              isBusy={isBusy}
              onSave={(publicId, newTitle) =>
                update.mutate({ publicId, title: newTitle })
              }
              onDelete={(publicId) => remove.mutate({ publicId })}
              onMove={(publicId) => openModal("MOVE_INBOX_ITEM", publicId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
