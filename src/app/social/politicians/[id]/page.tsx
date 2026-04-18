import type { Metadata } from "next";
import PoliticianProfileClient from "./politician-profile-client";

export const metadata: Metadata = {
  title: "Politician Profile — Poll City Social",
  description: "View this politician's posts, approval rating, and Q&A.",
};

export default function Page() {
  return <PoliticianProfileClient />;
}
