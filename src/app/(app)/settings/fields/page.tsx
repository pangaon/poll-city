import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getSession } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import FieldsSettingsClient from "./fields-client";
export const metadata = { title: "Field Configuration" };

export default async function FieldsPage() {
  const { campaignId, role, userId } = await resolveActiveCampaign();
  
  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(role)) redirect("/settings");
  return <FieldsSettingsClient campaignId={campaignId} />;
}
