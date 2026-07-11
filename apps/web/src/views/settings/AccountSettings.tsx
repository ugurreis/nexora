import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useState } from "react";

import Button from "~/components/Button";
import Input from "~/components/Input";
import FeedbackModal from "~/components/FeedbackModal";
import { FontSizeSelector } from "~/components/FontSizeSelector";
import { LanguageSelector } from "~/components/LanguageSelector";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";

function maskInboxEmail(email: string) {
  const [local, domain] = email.split("@");
  const token = local?.replace(/^inbox\+/, "") ?? "";
  const maskedToken =
    token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : token;
  return `inbox+${maskedToken}@${domain}`;
}

export default function AccountSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { showPopup } = usePopup();
  const isCredentialsEnabled =
    env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
  const { data } = api.user.getUser.useQuery();
  const utils = api.useUtils();
  const { data: inboxEmail } = api.user.getInboxEmail.useQuery();
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");

  const setInboxEmailAlias = api.user.setInboxEmailAlias.useMutation({
    onSuccess: async () => {
      await utils.user.getInboxEmail.invalidate();
      setIsEditingAlias(false);
      showPopup({
        header: t`Adres güncellendi`,
        message: t`Gelen kutusu adresin güncellendi.`,
        icon: "success",
      });
    },
    onError: (error) => {
      showPopup({
        header: t`Adres güncellenemedi`,
        message: error.message || t`Lütfen tekrar deneyin.`,
        icon: "error",
      });
    },
  });
  const { data: telegramStatus, refetch: refetchTelegramStatus } =
    api.user.getTelegramLinkStatus.useQuery();
  const generateTelegramLink = api.user.generateTelegramLinkToken.useMutation({
    onSuccess: (result) => {
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: () =>
      showPopup({
        header: t`Could not connect Telegram`,
        message: t`Please try again.`,
        icon: "error",
      }),
  });
  const disconnectTelegram = api.user.disconnectTelegram.useMutation({
    onSuccess: async () => {
      await refetchTelegramStatus();
    },
  });

  const copyInboxEmail = async () => {
    if (!inboxEmail?.email) return;
    await navigator.clipboard.writeText(inboxEmail.email);
    showPopup({
      header: t`Copied`,
      message: t`Inbox email address copied to clipboard.`,
      icon: "success",
    });
  };

  return (
    <>
      <PageHead title={t`Settings | Account`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Profile picture`}
        </h2>
        <Avatar userId={data?.id} userImage={data?.image} />

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Display name`}
          </h2>
          <UpdateDisplayNameForm displayName={data?.name ?? ""} />
        </div>

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Email`}
          </h2>
          <p className="text-sm text-neutral-700 dark:text-dark-900">{data?.email}</p>
        </div>

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Inbox email address`}
          </h2>
          <p className="mb-2 text-sm text-neutral-500 dark:text-dark-900">
            {t`Send an email to this address to add an item to your inbox. Only send from your registered email address.`}
          </p>
          {isEditingAlias ? (
            <div className="max-w-sm">
              <Input
                prefix="inbox+"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value.toLowerCase())}
                placeholder={t`örn. ahmet-yilmaz`}
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={setInboxEmailAlias.isPending}
                  disabled={aliasInput.trim().length < 3}
                  onClick={() =>
                    setInboxEmailAlias.mutate({ alias: aliasInput.trim() })
                  }
                >
                  {t`Kaydet`}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingAlias(false)}
                >
                  {t`İptal`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-sm text-neutral-700 dark:text-dark-900"
                title={inboxEmail?.email}
              >
                {inboxEmail?.email ? maskInboxEmail(inboxEmail.email) : "…"}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!inboxEmail?.email}
                onClick={copyInboxEmail}
              >
                {t`Copy`}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingAlias(true)}
              >
                {t`Düzenle`}
              </Button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Telegram`}
          </h2>
          <p className="mb-2 text-sm text-neutral-500 dark:text-dark-900">
            {t`Connect Telegram to create tasks by leaving a voice message.`}
          </p>
          {telegramStatus?.linked ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-700 dark:text-dark-900">
                {t`Connected ✓`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                isLoading={disconnectTelegram.isPending}
                onClick={() => disconnectTelegram.mutate()}
              >
                {t`Disconnect`}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              isLoading={generateTelegramLink.isPending}
              onClick={() => generateTelegramLink.mutate()}
            >
              {t`Connect Telegram`}
            </Button>
          )}
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Language`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Change your language preferences.`}
          </p>
          <LanguageSelector />
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Font size`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Change the application font size.`}
          </p>
          <FontSizeSelector />
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Delete account`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Once you delete your account, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_ACCOUNT")}
            >
              {t`Delete account`}
            </Button>
          </div>
        </div>

        {isCredentialsEnabled && (
          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
              {data?.hasPassword ? t`Change Password` : t`Set Password`}
            </h2>
            <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
              {data?.hasPassword
                ? t`You are about to change your password.`
                : t`Set a password to enable password-based login.`}
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => openModal("CHANGE_PASSWORD")}
              >
                {data?.hasPassword ? t`Change Password` : t`Set Password`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Account-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_ACCOUNT"}
      >
        <DeleteAccountConfirmation />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "CHANGE_PASSWORD"}
      >
        <ChangePasswordFormConfirmation hasPassword={data?.hasPassword ?? false} />
      </Modal>

      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
