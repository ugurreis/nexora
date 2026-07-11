import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import {
  HiArrowRightOnRectangle,
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineDocumentDuplicate,
  HiOutlineTrash,
  HiOutlineStar,
  HiSparkles,
  HiStar,
} from "react-icons/hi2";
import { IoArchiveOutline } from "react-icons/io5";
import Dropdown from "~/components/Dropdown";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function BoardDropdown({
  isTemplate,
  isLoading,
  isArchived,
  boardPublicId,
  isFavorite,
  boardName,
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  boardName?: string;
}) {
  const router = useRouter();
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { canEditBoard, canDeleteBoard, canCreateBoard, canArchiveBoard } =
    usePermissions();
  const utils = api.useUtils();

  const updateBoard = api.board.update.useMutation({
    onSuccess: (_data, variables) => {
      void utils.board.all.invalidate();
      void utils.board.byId.invalidate();
      if (variables.isArchived !== undefined) {
        showPopup({
          header: variables.isArchived ? t`Pano arşivlendi` : t`Pano arşivden çıkarıldı`,
          message: variables.isArchived
            ? t`Pano arşivlendi.`
            : t`Pano arşivden çıkarıldı.`,
          icon: "success",
        });
        void router.push(`/boards`);
      } else if (variables.favorite !== undefined) {
        showPopup({
          header: variables.favorite
            ? t`Favorilere eklendi`
            : t`Favorilerden kaldırıldı`,
          message: variables.favorite
            ? t`${boardName ?? "Pano"} favorilerinize eklendi.`
            : t`${boardName ?? "Pano"} favorilerinizden kaldırıldı.`,
          icon: "success",
        });
      }
    },
    onError: () => {
      showPopup({
        header: t`Pano güncellenemedi`,
        message: t`Lütfen daha sonra tekrar deneyin.`,
        icon: "error",
      });
    },
  });

  const handleToggleFavorite = () => {
    updateBoard.mutate({
      boardPublicId,
      favorite: !isFavorite,
    });
  };

  const handleArchiveOrUnarchive = () => {
    updateBoard.mutate({
      boardPublicId,
      isArchived: !isArchived,
    });
  };

  const isArchiveActionPending = updateBoard.isPending;

  const items = [
    ...(!isTemplate && canCreateBoard
      ? [
        {
          label: t`Şablon yap`,
          action: () => openModal("CREATE_TEMPLATE"),
          icon: (
            <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
    ...(!isTemplate && canEditBoard
      ? [
        {
          label: t`Pano bağlantısını düzenle`,
          action: () => openModal("UPDATE_BOARD_SLUG"),
          icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]
      : []),
    ...(!isTemplate && canArchiveBoard
      ? [
        {
          label: isArchived ? t`Arşivden çıkar` : t`Panoyu arşivle`,
          action: handleArchiveOrUnarchive,
          icon: (
            <IoArchiveOutline className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
    ...(!isTemplate && canEditBoard
      ? [
        {
          label: t`Çalışma alanına taşı`,
          action: () => openModal("MOVE_BOARD"),
          icon: (
            <HiArrowRightOnRectangle className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
    ...(!isTemplate && canEditBoard
      ? [
        {
          label: t`Otomasyonlar`,
          action: () => openModal("AUTOMATIONS"),
          icon: <HiSparkles className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]
      : []),
    {
      label: isFavorite
        ? t`Favorilerden kaldır`
        : t`Favorilere ekle`,
      action: handleToggleFavorite,
      icon: isFavorite ? (
        <HiStar className="h-[16px] w-[16px] text-dark-900" />
      ) : (
        <HiOutlineStar className="h-[16px] w-[16px] text-dark-900" />
      ),
    },
    ...(canDeleteBoard
      ? [
        {
          label: isTemplate ? t`Şablonu sil` : t`Panoyu sil`,
          action: () => openModal("DELETE_BOARD"),
          icon: (
            <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      disabled={isLoading || isArchiveActionPending}
      items={items}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
