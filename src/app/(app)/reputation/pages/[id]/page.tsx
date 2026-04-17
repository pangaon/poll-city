import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PageEditorClient from "../_page-editor-client";

export const metadata = { title: "Response Page Editor — Poll City" };

export default async function PageEditorPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { issueId?: string };
}) {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <PageEditorClient
      campaignId={campaignId}
      pageId={params.id === "new" ? null : params.id}
      prefillIssueId={searchParams.issueId}
    />
  );
}
