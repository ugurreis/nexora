import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import InboxView from "~/views/inbox";

const InboxPage: NextPageWithLayout = () => {
  return (
    <>
      <InboxView />
      <Popup />
    </>
  );
};

InboxPage.getLayout = (page) => getDashboardLayout(page);

export default InboxPage;
