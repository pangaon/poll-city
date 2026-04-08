import type { Metadata } from "next";
import SocialDiscover from "./social-discover-client";

export const metadata: Metadata = {
  title: "Poll City Social — Civic Engagement for Canadians",
  description: "Follow local officials, vote in flash polls, sign petitions, and track election promises. Your civic life starts here.",
};

export const revalidate = 60;

export default function Page() {
  return <SocialDiscover />;
}
