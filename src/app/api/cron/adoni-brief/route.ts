import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { executeAction } from "@/lib/adoni/actions";
import type { ActionContext } from "@/lib/adoni/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily cron: generate Adoni daily brief for each active campaign with a subscription,
// store as AdoniConversation entry for retrieval.

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Find campaigns with active subscriptions
  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      memberships: {
        some: {
          user: {
            subscription: { status: "active" as never },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { role: { in: ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"] } },
        take: 1,
        select: {
          userId: true,
          role: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  let briefsGenerated = 0;

  for (const campaign of campaigns) {
    const owner = campaign.memberships[0];
    if (!owner) continue;

    const ctx: ActionContext = {
      userId: owner.userId,
      campaignId: campaign.id,
      userName: owner.user.name ?? "Campaign Manager",
      userRole: owner.role,
      permissions: ["analytics:read", "contacts:read", "gotv:read", "volunteers:read", "donations:read"],
      trustLevel: 5,
      autoExecuteEnabled: true,
    };

    try {
      const result = await executeAction("get_daily_brief", {}, ctx);

      if (result.success) {
        await prisma.adoniConversation.create({
          data: {
            campaignId: campaign.id,
            userId: owner.userId,
            page: "briefing",
            messages: [
              { role: "assistant", content: result.message },
            ],
          },
        });
        briefsGenerated++;
      }
    } catch (e) {
      console.error(`[adoni-brief] Failed for campaign ${campaign.id}:`, e);
    }
  }

  return NextResponse.json({ briefsGenerated });
}
