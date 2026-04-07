import type { Metadata } from "next";
import SocialOfficials from "./officials-client";

export const metadata: Metadata = {
  title: "Officials Directory — Poll City Social",
  description: "Browse and follow 3,500+ elected officials across Canada. See approval ratings, promises, and civic engagement data.",
};

export default function Page() {
  return <SocialOfficials />;
}
