import Link from "next/link";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CampaignSwitcherClient from "./campaign-switcher-client";
import { Plus } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";

export const metadata = { title: "Campaigns — Poll City" };

export default async function CampaignsPage() {
  const { campaignId, campaignName, role, userId } = await resolveActiveCampaign();

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          slug: true,
          electionType: true,
          createdAt: true,
          _count: { select: { contacts: true, tasks: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-blue-600 font-semibold uppercase tracking-wide">Campaign Operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">Manage campaigns and switch context</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">Create new campaigns, review the campaigns you belong to, and use the campaign switcher in the sidebar to change context.</p>
        </div>
        <Link href="/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New campaign
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Active campaign</p>
                <p className="text-xs text-gray-500">Currently selected campaign for your session.</p>
              </div>
              <Badge variant="success">{role}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900">{campaignName}</p>
              <p className="text-sm text-gray-600">ID: {campaignId}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="info">Campaign operations</Badge>
                <Badge variant="info">Role: {role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-gray-900">Quick actions</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/settings" className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Campaign settings</Link>
            <Link href="/settings/fields" className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Custom fields</Link>
            <Link href="/import-export" className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Import / export contacts</Link>
            <Link href="/call-list" className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Call list & follow-ups</Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-900">My campaigns</p>
        <div className="grid gap-4">
          {memberships.map((membership: (typeof memberships)[number]) => (
            <Card key={membership.campaign.id}>
              <CardContent className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr] items-start">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{membership.campaign.name}</p>
                  <p className="text-sm text-gray-500">{membership.campaign.electionType} • joined as {membership.role}</p>
                  <p className="text-xs text-gray-400 mt-1">Created {new Date(membership.campaign.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <CampaignSwitcherClient campaignId={membership.campaign.id} active={membership.campaign.id === campaignId} />
                  <div className="space-x-2 text-xs text-gray-500">
                    <span>{membership.campaign._count.contacts} contacts</span>
                    <span>{membership.campaign._count.tasks} tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
