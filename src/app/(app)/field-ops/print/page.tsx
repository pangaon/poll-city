import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { Suspense } from "react";
import PrintWalkListClient from "@/app/(app)/canvassing/print-walk-list/print-walk-list-client";

export const metadata = { title: "Print Preview — Field Ops — Poll City" };

interface Props {
  searchParams: {
    assignmentId?: string;
    assignmentName?: string;
    ward?: string;
    support?: string;
    standalone?: string;
    mode?: "canvass" | "signs" | "lit-drop";
    template?: string;
  };
}

export default async function FieldOpsPrintPage({ searchParams }: Props) {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const mode = (["canvass", "signs", "lit-drop"] as const).includes(
    searchParams.mode as "canvass" | "signs" | "lit-drop",
  )
    ? (searchParams.mode as "canvass" | "signs" | "lit-drop")
    : "canvass";

  const template = (["standard", "compact", "signs", "gotv"] as const).includes(
    searchParams.template as "standard" | "compact" | "signs" | "gotv",
  )
    ? (searchParams.template as "standard" | "compact" | "signs" | "gotv")
    : "standard";

  return (
    <Suspense>
      <PrintWalkListClient
        campaignId={campaignId}
        campaignName={campaignName}
        mode={mode}
        defaultAssignmentId={searchParams.assignmentId}
        defaultTemplate={template}
      />
    </Suspense>
  );
}
