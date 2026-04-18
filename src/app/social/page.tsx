import type { Metadata } from "next";
import SocialFeed from "./social-feed-client";

export const metadata: Metadata = {
  title: "Poll City Social — Your Civic Feed",
  description: "Follow local officials, track civic announcements, vote on polls, and stay engaged with your community.",
};

export default function Page() {
  return <SocialFeed />;
}
