import type { Metadata } from "next";
import PublicNav from "@/components/layout/public-nav";
import OfficialsClient from "./officials-client";

export const metadata: Metadata = {
  title: "Find Your Elected Officials — Poll City Canada",
  description:
    "Search 1100+ Canadian elected officials at federal provincial and municipal level. Find your MP MPP mayor or councillor and see their Poll City profile.",
  openGraph: {
    title: "Find Your Elected Officials — Poll City Canada",
    description: "Search 1100+ Canadian elected officials at federal provincial and municipal level.",
    type: "website",
  },
};

export default function OfficialsPage() {
  return (
    <>
      <PublicNav />
      <OfficialsClient />
    </>
  );
}
