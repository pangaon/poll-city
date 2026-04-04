import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getSession } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import ImportExportClient from "./import-export-client";
export const metadata = { title: "Import / Export" };

export default async function ImportExportPage() {
  const { campaignId, role, userId } = await resolveActiveCampaign();
  
  return <ImportExportClient campaignId={campaignId} />;
}
