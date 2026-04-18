import type { Metadata } from "next";
import NotificationsClient from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications — Poll City Social",
  description: "Your civic notifications from followed officials.",
};

export default function Page() {
  return <NotificationsClient />;
}
