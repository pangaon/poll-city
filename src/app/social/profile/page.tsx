import type { Metadata } from "next";
import SocialProfile from "./profile-client";

export const metadata: Metadata = {
  title: "My Civic Profile — Poll City Social",
  description: "Your voter passport, civic credits, and engagement history.",
};

export default function Page() {
  return <SocialProfile />;
}
