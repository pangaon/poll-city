import Link from "next/link";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { ShieldAlert, Settings, PlusCircle, FileSearch, Users } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "@/components/ui";

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Contacts", value: contactCount, icon: Users },
          { label: "Volunteers", value: volunteerCount, icon: ShieldAlert },
          { label: "Signs", value: signCount, icon: FileSearch },
          { label: "Donations", value: donationCount, icon: PlusCircle },
          { label: "Tasks", value: taskCount, icon: Settings },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{metric.value}</p>
              </div>
              <metric.icon className="w-8 h-8 text-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-gray-900">Administrative actions</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href="/settings" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Campaign settings</Link>
          <Link href="/settings/fields" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Custom field configuration</Link>
          <Link href="/campaigns" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Campaign operations</Link>
          <Link href="/import-export" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700">Import / export</Link>
        </CardContent>
      </Card>
    </div>
  );
}
