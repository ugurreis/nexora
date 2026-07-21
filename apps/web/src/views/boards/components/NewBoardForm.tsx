import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import type { Template } from "./TemplateBoards";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { getAvatarColor } from "~/utils/avatarColor";
import TemplateBoards from "./TemplateBoards";

const schema = z.object({
  name: z
    .string()
    .min(1, { message: t`Pano adı zorunludur` })
    .max(100, { message: t`Pano adı 100 karakteri geçemez` }),
  workspacePublicId: z.string(),
  template: z.custom<Template | null>(),
  dueDate: z.string().optional(),
});

interface NewBoardInputWithTemplate {
  name: string;
  workspacePublicId: string;
  template: Template | null;
  dueDate?: string;
}

export function NewBoardForm({ isTemplate }: { isTemplate?: boolean }) {
  const utils = api.useUtils();
  const { closeModal } = useModal();
  const router = useRouter();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { data: templates } = api.board.all.useQuery(
    { workspacePublicId: workspace.publicId ?? "", type: "template" },
    { enabled: !!workspace.publicId },
  );
  const { data: wsData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId ?? "" },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );
  const members = (wsData?.members ?? []).filter(
    (m) => m.status === "active",
  );

  const toggleMember = (publicId: string) =>
    setSelectedMembers((prev) =>
      prev.includes(publicId)
        ? prev.filter((id) => id !== publicId)
        : [...prev, publicId],
    );

  const memberInitials = (name?: string | null, email?: string) => {
    const src = name?.trim() || email?.split("@")[0] || "?";
    return src
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  };

  const formattedTemplates = templates?.map((template) => ({
    id: template.publicId,
    sourceBoardPublicId: template.publicId,
    name: template.name,
    lists: template.lists.map((list) => list.name),
    labels: template.labels.map((label) => label.name),
  }));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewBoardInputWithTemplate>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      workspacePublicId: workspace.publicId || "",
      template: null,
      dueDate: "",
    },
  });

  const currentTemplate = watch("template");

  const refetchBoards = () => utils.board.all.refetch();

  const createBoard = api.board.create.useMutation({
    onSuccess: async (board) => {
      if (!board) {
        showPopup({
          header: t`Error`,
          message: t`Failed to create board`,
          icon: "error",
        });
      } else {
        router.push(
          `${isTemplate ? "/templates" : "/boards"}/${board.publicId}`,
        );
      }
      closeModal();

      await refetchBoards();
    },
    onError: () => {
      showPopup({
        header: t`Hata`,
        message: t`Pano oluşturulamadı`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: NewBoardInputWithTemplate) => {
    createBoard.mutate({
      name: data.name,
      workspacePublicId: data.workspacePublicId,
      sourceBoardPublicId: data.template?.sourceBoardPublicId ?? undefined,
      lists: data.template?.lists ?? [],
      labels: data.template?.labels ?? [],
      type: isTemplate ? "template" : "regular",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      memberPublicIds: selectedMembers,
    });
  };

  useEffect(() => {
    const titleElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#name");
    if (titleElement) titleElement.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="text-neutral-9000 flex w-full items-center justify-between pb-4 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{isTemplate ? t`Yeni şablon` : t`Yeni pano`}</h2>
          <button
            type="button"
            className="hover:bg-li ght-300 rounded p-1 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          aria-label={t`Close`}
          >
            <HiXMark size={18} className="dark:text-dark-9000 text-light-900" />
          </button>
        </div>
        <Input
          id="name"
          placeholder={t`Ad`}
          {...register("name", { required: true })}
          errorMessage={errors.name?.message}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
        {!isTemplate && (
          <div className="mt-4">
            <label
              htmlFor="dueDate"
              className="mb-1.5 block text-sm font-medium text-light-900 dark:text-dark-900"
            >
              {t`Proje teslim tarihi (opsiyonel)`}
            </label>
            <input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              className="w-full rounded-md border-0 bg-light-50 px-3 py-2 text-sm text-light-1000 shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        )}
        {!isTemplate && members.length > 0 && (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Proje ekibi (opsiyonel)`}
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const selected = selectedMembers.includes(m.publicId);
                return (
                  <button
                    key={m.publicId}
                    type="button"
                    onClick={() => toggleMember(m.publicId)}
                    className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition-colors ${
                      selected
                        ? "bg-brand-500/10 text-brand-700 ring-brand-400 dark:text-brand-300"
                        : "bg-light-50 text-light-1000 ring-light-300 hover:ring-brand-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(
                        m.email,
                      )}`}
                    >
                      {memberInitials(m.user?.name, m.email)}
                    </span>
                    {m.user?.name ?? m.email}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <TemplateBoards
        currentBoard={currentTemplate}
        setCurrentBoard={(t) => setValue("template", t)}
        showTemplates={showTemplates}
        customTemplates={formattedTemplates ?? []}
      />
      <div className="mt-12 flex items-center justify-end space-x-4 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        {!isTemplate && (
          <Toggle
            label={t`Şablon kullan`}
            isChecked={showTemplates}
            onChange={() => {
              setShowTemplates(!showTemplates);
              if (!showTemplates && !currentTemplate) {
                setValue("template", (templates?.[0] as any) ?? null);
              }
            }}
          />
        )}
        <div>
          <Button type="submit" isLoading={createBoard.isPending}>
            {isTemplate ? t`Şablon oluştur` : t`Pano oluştur`}
          </Button>
        </div>
      </div>
    </form>
  );
}
