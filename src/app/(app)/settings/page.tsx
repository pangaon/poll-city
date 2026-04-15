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
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true, name: true, slug: true,
        candidateName: true, candidateTitle: true, candidateBio: true,
        candidateEmail: true, candidatePhone: true,
        primaryColor: true, electionType: true, jurisdiction: true, electionDate: true,
      },
    }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { id: true, name: true, email: true, phone: true, avatarUrl: true } }),
  ]);

  const integrations = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    resend: !!process.env.RESEND_API_KEY,
    twilio: !!process.env.TWILIO_ACCOUNT_SID,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    upstash: !!process.env.UPSTASH_REDIS_REST_URL,
    vapid: !!process.env.VAPID_PUBLIC_KEY,
  };

  return <SettingsClient campaign={campaign!} user={user!} userRole={role} integrations={integrations} />;
}
