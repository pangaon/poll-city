import type { Metadata } from "next";
import OfficialDetailPage from "./official-detail-client";

export const metadata: Metadata = {
  title: "Official Profile — Poll City Social",
  description: "View this official's approval rating, promises, and civic engagement.",
};

export default function Page() {
  return <OfficialDetailPage />;
}
