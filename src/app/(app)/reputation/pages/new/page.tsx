import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PageEditorClient from "../_page-editor-client";

export const metadata = { title: "New Response Page — Poll City" };

export default async function NewResponsePagePage({
  searchParams,
}: {
  searchParams: { issueId?: string };
}) {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <PageEditorClient
      campaignId={campaignId}
      pageId={null}
      prefillIssueId={searchParams.issueId}
    />
  );
}
