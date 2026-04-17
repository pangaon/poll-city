import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import IssueWorkspaceClient from "./issue-workspace-client";

export const metadata = { title: "Issue Workspace — Poll City" };

export default async function IssueWorkspacePage({ params }: { params: { id: string } }) {
  const { campaignId } = await resolveActiveCampaign();
  return <IssueWorkspaceClient campaignId={campaignId} issueId={params.id} />;
}
