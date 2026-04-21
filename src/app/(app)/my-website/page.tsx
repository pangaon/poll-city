import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import WebsiteEditorClient from "./website-editor-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Website | Poll City" };

export default async function MyWebsitePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; activeCampaignId?: string | null };
  if (!user.activeCampaignId) redirect("/dashboard");

  const campaign = await prisma.campaign.findUnique({
    where: { id: user.activeCampaignId },
    select: {
      id: true,
      slug: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      tagline: true,
      websiteUrl: true,
      facebookUrl: true,
      instagramHandle: true,
      twitterHandle: true,
      primaryColor: true,
      customization: true,
      isPublic: true,
    },
  });

  if (!campaign) redirect("/dashboard");

  return <WebsiteEditorClient campaign={campaign} />;
}
