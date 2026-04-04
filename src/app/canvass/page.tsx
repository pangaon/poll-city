import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CanvassMobileClient from "./canvass-mobile-client";

export default async function CanvassPage() {
  const { campaignId, userId } = await resolveActiveCampaign();

  // Get canvass assignments for this user
  const assignments = await prisma.canvassAssignment.findMany({
    where: {
      campaignId,
      assignedToId: userId,
      status: { in: ["assigned", "in_progress"] }
    },
    include: {
      canvassList: {
        include: {
          contacts: {
            include: { contact: true },
            orderBy: { order: "asc" }
          }
        }
      }
    }
  });

  return (
    <CanvassMobileClient
      campaignId={campaignId}
      userId={userId}
      assignments={assignments}
    />
  );
}