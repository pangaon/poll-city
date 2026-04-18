import type { Metadata } from "next";
import GroupsClient from "./groups-client";

export const metadata: Metadata = {
  title: "Civic Groups — Poll City Social",
  description: "Join interest groups to follow housing, transit, safety, and other civic issues in your community.",
};

export default function Page() {
  return <GroupsClient />;
}
