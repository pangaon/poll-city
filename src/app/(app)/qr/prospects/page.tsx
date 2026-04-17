import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import ProspectsClient from "./prospects-client";

export const metadata: Metadata = { title: "QR Prospects — Poll City" };

export default async function ProspectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) redirect("/dashboard");

  return <ProspectsClient campaignId={campaignId} />;
}
