import Link from "next/link";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { ShieldAlert, Settings, PlusCircle, FileSearch, Users } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";
import AdminPartyClient from "./admin-party-client";

export const metadata = { title: "Admin — Poll City" };

export default async function AdminPage() {
  const { campaignId, campaignName, role } = await resolveActiveCampaign();

  const [campaign, contactCount, volunteerCount, signCount, donationCount, taskCount] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, name: true, electionType: true, slug: true } }),
    prisma.contact.count({ where: { campaignId } }),
    prisma.volunteerProfile.count({ where: { campaignId } }),
    prisma.sign.count({ where: { campaignId } }),
    prisma.donation.count({ where: { campaignId } }),
    prisma.task.count({ where: { campaignId } }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-wide">Admin Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">{campaign?.name || campaignName}</h1>
          <p className="mt-2 text-sm text-gray-600">View campaign health, admin controls, and important team metrics for the current campaign.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">Role: {role}</Badge>
          <Badge variant="info">Campaign: {campaign?.electionType ?? "Unknown"}</Badge>
        </div>
      </div>

      <AdminPartyClient
        campaignId={campaignId}
        contactCount={contactCount}
        volunteerCount={volunteerCount}
        signCount={signCount}
        donationCount={donationCount}
        taskCount={taskCount}
      />
    </div>
  );
}
