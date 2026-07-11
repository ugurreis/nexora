import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import WebhookSettings from "~/views/settings/WebhookSettings";
import Popup from "~/components/Popup";

const WebhookSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="webhooks">
      <WebhookSettings />
      <Popup />
    </SettingsLayout>
  );
};

WebhookSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default WebhookSettingsPage;
