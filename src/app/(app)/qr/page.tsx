import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import QrHubClient from "./qr-hub-client";

export const metadata: Metadata = { title: "QR Capture — Poll City" };

export default async function QrPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) redirect("/dashboard");

  return <QrHubClient campaignId={campaignId} />;
}
