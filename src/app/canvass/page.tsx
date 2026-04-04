import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CanvassMobileClient from "./canvass-mobile-client";

export default async function CanvassPage() {
  const { campaignId, userId } = await resolveActiveCampaign();

  // Get canvass assignments for this user
  const assignments = await prisma.canvassAssignment.findMany({
    where: {
      userId,
      status: { in: ["not_started", "in_progress"] }
    },
    include: {
      canvassList: true
    }
  });

  // Filter by campaign
  const filteredAssignments = assignments.filter(a => a.canvassList.campaignId === campaignId);

  // For now, return empty assignments since the schema doesn't have contacts on canvassList
  return <CanvassMobileClient campaignId={campaignId} userId={userId} assignments={[]} />;
}