import { useState } from "react";
import { t } from "@lingui/core/macro";

import Button from "~/components/Button";

export interface InboxItemRowProps {
  publicId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  source: "manual" | "email";
  onSave: (publicId: string, title: string) => void;
  onDelete: (publicId: string) => void;
  onMove: (publicId: string) => void;
  isBusy: boolean;
}

export default function InboxItemRow({
  publicId,
  title,
  description,
  dueDate,
  source,
  onSave,
  onDelete,
  onMove,
  isBusy,
}: InboxItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== title) onSave(publicId, next);
    setIsEditing(false);
  };

  return (
    <li className="flex items-start justify-between gap-3 border-b border-light-300 px-2 py-3 dark:border-dark-300">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            autoFocus
            aria-label={t`Edit title`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="w-full rounded-md border border-light-300 bg-transparent px-2 py-1 text-sm dark:border-dark-300"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(title);
              setIsEditing(true);
            }}
            className="block w-full truncate text-left text-sm text-neutral-900 dark:text-dark-1000"
          >
            {title}
          </button>
        )}
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-dark-900">
            {description}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400 dark:text-dark-800">
          <span>{source === "email" ? t`Email` : t`Manual`}</span>
          {dueDate ? <span>{new Date(dueDate).toLocaleDateString()}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => onMove(publicId)}>
          {t`Move to board`}
        </Button>
        <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => onDelete(publicId)}>
          {t`Delete`}
        </Button>
      </div>
    </li>
  );
}
