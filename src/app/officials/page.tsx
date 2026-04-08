import type { Metadata } from "next";
import PublicNav from "@/components/layout/public-nav";
import OfficialsClient from "./officials-client";
import CalendarSubscribeButton from "@/components/ui/CalendarSubscribeButton";

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

export const revalidate = 60;

export default function OfficialsPage() {
  return (
    <>
      <PublicNav />
      <OfficialsClient />
      <div className="px-4 py-6 max-w-4xl mx-auto border-t border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Stay Informed
        </p>
        <CalendarSubscribeButton postalCode="M4C" />
      </div>
    </>
  );
}
