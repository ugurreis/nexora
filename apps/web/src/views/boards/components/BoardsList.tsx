import Link from "next/link";
import { t } from "@lingui/core/macro";
import { HiOutlineRectangleStack, HiOutlineStar, HiOutlineTrash, HiStar } from "react-icons/hi2";
import { motion } from "framer-motion";
import Button from "~/components/Button";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function BoardsList({ isTemplate, archived = false }: { isTemplate?: boolean; archived?: boolean }) {
  const { workspace } = useWorkspace();
  const { openModal } = useModal();
  const { canCreateBoard, canDeleteBoard } = usePermissions();

  const utils = api.useUtils();
  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate();
    },
  });

  const { data, isLoading } = api.board.all.useQuery(
    {
      workspacePublicId: workspace.publicId,
      type: isTemplate ? "template" : "regular",
      archived: archived,
    },
    { enabled: workspace.publicId ? true : false },
  );

  const handleToggleFavorite = (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateBoard.mutate({
      boardPublicId,
      favorite: !currentFavorite,
    });
  };

  const handleDelete = (e: React.MouseEvent, boardPublicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    openModal("DELETE_BOARD", boardPublicId);
  };


  if (isLoading)
    return (
      <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
      </div>
    );

  if (data?.length === 0)
    return (
      <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
        <div className="flex flex-col items-center">
          <HiOutlineRectangleStack className="h-10 w-10 text-light-800 dark:text-dark-800" />
          <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
            {archived
              ? t`Arşivlenmiş pano yok`
              : isTemplate
                ? t`Şablon yok`
                : t`Pano yok`}
          </p>
          <p className="text-[14px] text-light-900 dark:text-dark-900">
            {archived
              ? t`Arşivlediğiniz panolar burada görünür.`
              : isTemplate
                ? t`Yeni bir şablon oluşturarak başlayın`
                : t`Yeni bir pano oluşturarak başlayın`}
          </p>
        </div>
        <Tooltip
          content={
            !canCreateBoard ? t`You don't have permission` : undefined
          }
        >
          <Button
            onClick={() => {
              if (canCreateBoard) openModal("NEW_BOARD");
            }}
            disabled={!canCreateBoard}
          >
            {isTemplate ? t`Yeni şablon oluştur` : t`Yeni pano oluştur`}
          </Button>
        </Tooltip>
      </div>
    );

  return (
    <motion.div
      className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
      layout
    >
      {data?.map((board) => (
        <motion.div
          key={board.publicId}
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1
            },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 }
          }}
        >
          <Link
            href={`${isTemplate ? "templates" : "boards"}/${board.publicId}`}
          >
            <div className="group relative mr-5 flex h-[190px] w-full flex-col overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-light-300/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_8px_-2px_rgba(16,24,40,0.06),0_16px_36px_-18px_rgba(13,148,136,0.14)] transition-all hover:-translate-y-0.5 hover:ring-brand-400/60 dark:bg-dark-50 dark:ring-dark-300">
              {/* Landing kartlarındaki yumuşak emerald aksan */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 to-brand-600"
              />
              {/* Yumuşak emerald parıltı — derinlik */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-brand-400/15 blur-2xl"
              />
              <button
                onClick={(e) => handleToggleFavorite(e, board.publicId, board.favorite)}
                className={`absolute right-3 top-3 z-10 rounded p-1 transition-all hover:bg-light-300 dark:hover:bg-dark-200 ${board.favorite ? "" : "md:opacity-0 md:group-hover:opacity-100"
                  }`}
                aria-label={board.favorite ? t`Favorilerden kaldır` : t`Favorilere ekle`}
              >
                {board.favorite ? (
                  <HiStar className="h-5 w-5 text-neutral-700 dark:text-dark-1000" />
                ) : (
                  <HiOutlineStar className="h-5 w-5 text-neutral-700 dark:text-dark-800" />
                )}
              </button>
              {canDeleteBoard && (
                <button
                  onClick={(e) => handleDelete(e, board.publicId)}
                  className="absolute right-10 top-3 z-10 rounded p-1 text-neutral-700 transition-all hover:bg-light-300 hover:text-red-600 dark:text-dark-800 dark:hover:bg-dark-200 dark:hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={isTemplate ? t`Şablonu sil` : t`Panoyu sil`}
                >
                  <HiOutlineTrash className="h-5 w-5" />
                </button>
              )}
              {/* Başlık */}
              <div className="relative z-[1] flex items-center gap-2.5 pr-16">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_4px_10px_-2px_rgba(13,148,136,0.45)]">
                  <HiOutlineRectangleStack className="h-4 w-4" />
                </span>
                <p className="truncate text-[14px] font-bold text-light-1000 dark:text-dark-1000">
                  {board.name}
                </p>
              </div>

              {/* Etiket renkleri */}
              {board.labels.length > 0 && (
                <div className="relative z-[1] mt-3 flex flex-wrap gap-1">
                  {board.labels.slice(0, 8).map((label) => (
                    <span
                      key={label.publicId}
                      title={label.name}
                      className="h-1.5 w-6 rounded-full"
                      style={{ backgroundColor: label.colourCode ?? "#cbd5e1" }}
                    />
                  ))}
                </div>
              )}

              {/* Liste kolonları önizleme — şablonun/panonun içi */}
              <div className="relative z-[1] mt-auto flex flex-wrap gap-1.5">
                {board.lists.slice(0, 4).map((list) => (
                  <span
                    key={list.publicId}
                    className="rounded-md bg-light-100 px-2 py-1 text-[11px] font-medium text-light-950 dark:bg-dark-100 dark:text-dark-900"
                  >
                    {list.name}
                  </span>
                ))}
                {board.lists.length > 4 && (
                  <span className="rounded-md bg-light-100 px-2 py-1 text-[11px] font-medium text-light-900 dark:bg-dark-100 dark:text-dark-800">
                    +{board.lists.length - 4}
                  </span>
                )}
                {board.lists.length === 0 && (
                  <span className="text-[11px] text-light-800 dark:text-dark-800">
                    {t`Boş`}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
