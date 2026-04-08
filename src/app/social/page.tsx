import type { Metadata } from "next";
import SocialDiscover from "./social-discover-client";
import CalendarSubscribeButton from "@/components/ui/CalendarSubscribeButton";

export const metadata: Metadata = {
  title: "Poll City Social — Civic Engagement for Canadians",
  description: "Follow local officials, vote in flash polls, sign petitions, and track election promises. Your civic life starts here.",
};

export const revalidate = 60;

export default function Page() {
  return (
    <>
      <SocialDiscover />
      <div className="px-4 py-6 max-w-2xl mx-auto border-t border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Stay Informed
        </p>
        <CalendarSubscribeButton postalCode="M4C" />
      </div>
    </>
  );
}
