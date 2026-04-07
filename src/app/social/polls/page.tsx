import type { Metadata } from "next";
import SocialPolls from "./polls-client";

export const metadata: Metadata = {
  title: "Civic Polls — Poll City Social",
  description: "Vote on issues that matter to your community. Anonymous, secure, and transparent polling.",
};

export default function Page() {
  return <SocialPolls />;
}
