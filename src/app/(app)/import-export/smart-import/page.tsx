import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getSession } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import SmartImportWizard from "./smart-import-wizard";
export const metadata = { title: "Smart Import" };

export default async function SmartImportPage() {
  const { campaignId, role, userId } = await resolveActiveCampaign();
  
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Smart Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload any voter list or contact file. We handle the rest.</p>
      </div>
      <SmartImportWizard campaignId={campaignId} />
    </div>
  );
}
