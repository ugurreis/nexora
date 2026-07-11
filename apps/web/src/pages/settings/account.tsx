import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import AccountSettings from "~/views/settings/AccountSettings";
import Popup from "~/components/Popup";

const AccountSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="account">
      <AccountSettings />
      <Popup />
    </SettingsLayout>
  );
};

AccountSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default AccountSettingsPage;
