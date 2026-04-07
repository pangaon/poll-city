import type { Metadata } from "next";
import PollDetailPage from "./poll-detail-client";

export const metadata: Metadata = {
  title: "Poll — Poll City Social",
  description: "Cast your vote on this civic poll. Anonymous and secure.",
};

export default function Page() {
  return <PollDetailPage />;
}
