import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { Suspense } from "react";
import PrintWalkListClient from "@/app/(app)/canvassing/print-walk-list/print-walk-list-client";

export const metadata = { title: "Walk List — Print" };

interface Props {
  searchParams: {
    assignmentId?: string;
    ward?: string;
    support?: string;
    standalone?: string;
    mode?: string;
  };
}

/**
 * Isolated print page — no sidebar, no topbar, no app chrome.
 * Renders the walk list document and auto-triggers window.print() on load.
 * Lives outside (app) layout so the browser captures only the document.
 */
export default async function PrintWalkListPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { campaignId, campaignName } = await resolveActiveCampaign();

  return (
    <Suspense>
      <PrintWalkListClient
        campaignId={campaignId}
        campaignName={campaignName}
        mode="canvass"
        defaultAssignmentId={searchParams.assignmentId}
      />
    </Suspense>
  );
}
