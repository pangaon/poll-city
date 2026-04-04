import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getSession } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { aiAssist } from "@/lib/ai";
import AIAssistClient from "./ai-assist-client";
export const metadata = { title: "AI Assist" };

export default async function AIAssistPage() {
  const { campaignId, role, userId } = await resolveActiveCampaign();
  
  return <AIAssistClient campaignId={campaignId} isMock={aiAssist.isMockMode()} />;
}
