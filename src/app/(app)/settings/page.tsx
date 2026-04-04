import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import SettingsClient from "./settings-client";
export const metadata = { title: "Settings — Poll City" };

export default async function SettingsPage() {
  const { campaignId, role } = await resolveActiveCampaign();
  const session = await getServerSession(authOptions);
  const [campaign, user] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId } }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { id: true, name: true, email: true, phone: true, avatarUrl: true } }),
  ]);
  return <SettingsClient campaign={campaign!} user={user!} userRole={role} />;
}
