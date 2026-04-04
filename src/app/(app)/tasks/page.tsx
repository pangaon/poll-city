import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import TasksClient from "./tasks-client";
export const metadata = { title: "Tasks — Poll City" };

export default async function TasksPage() {
  const { campaignId, userId } = await resolveActiveCampaign();
  const teamMembers = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return (
    <TasksClient
      campaignId={campaignId}
      teamMembers={teamMembers.map(m => m.user)}
      currentUserId={userId}
    />
  );
}
