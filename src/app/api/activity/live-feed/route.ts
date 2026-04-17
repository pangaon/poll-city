/**
 * GET /api/activity/live-feed — Real-time campaign activity stream.
 *
 * Powers the live ticker in the war room. Every action across the
 * entire campaign flows through here — door knocks, phone calls,
 * new supporters, donations, sign deployments, volunteer signups.
 *
 * Returns the last N activities in human-readable format.
 * Designed for 10-second polling by the war room dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") || "20")));
  const since = sp.get("since"); // ISO timestamp — only return activities after this

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const where: Record<string, unknown> = { campaignId: campaignId! };
  if (since) where.createdAt = { gt: new Date(since) };

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, role: true } } },
  });
  const visibleActivities = activities.filter((a) => a.user?.role !== "SUPER_ADMIN");

  // Transform into human-readable feed items — SUPER_ADMIN actions are filtered above
  const feed = visibleActivities.map((a) => {
    const who = a.user?.name?.split(" ")[0] ?? "Someone";
    const details = (a.details ?? {}) as Record<string, unknown>;
    const time = a.createdAt;

    let message: string;
    let icon: string;
    let category: "canvass" | "gotv" | "donation" | "volunteer" | "sign" | "import" | "system";

    switch (a.action) {
      case "created":
        if (a.entityType === "contact") {
          message = `${who} added ${details.name ?? "a contact"}`;
          icon = "user-plus"; category = "canvass";
        } else if (a.entityType === "canvass_list") {
          message = `${who} created canvass list "${details.name ?? ""}"`;
          icon = "map"; category = "canvass";
        } else {
          message = `${who} created a ${a.entityType}`;
          icon = "plus"; category = "system";
        }
        break;
      case "updated":
        message = `${who} updated ${a.entityType} ${details.name ?? ""}`.trim();
        icon = "edit"; category = "system";
        break;
      case "deleted":
        message = `${who} removed a ${a.entityType}`;
        icon = "trash"; category = "system";
        break;
      case "gotv_mark_voted":
        message = `✅ ${details.name ?? "A supporter"} voted!`;
        icon = "check-circle"; category = "gotv";
        break;
      case "gotv_strike_off":
        message = `✅ ${details.name ?? "A supporter"} struck off — voted`;
        icon = "check-circle"; category = "gotv";
        break;
      case "gotv_upload_voted_list":
      case "gotv_upload":
        message = `${who} uploaded voted list — ${details.matched ?? 0} matched`;
        icon = "upload"; category = "gotv";
        break;
      case "gotv_ride_arranged":
        message = `🚗 Ride arranged for ${details.name ?? "a supporter"}`;
        icon = "car"; category = "gotv";
        break;
      case "donation_recorded":
        message = `💰 $${details.amount ?? 0} donation recorded`;
        icon = "dollar-sign"; category = "donation";
        break;
      case "smart_import_execute":
        message = `📥 ${who} imported ${details.importedCount ?? 0} contacts`;
        icon = "download"; category = "import";
        break;
      case "canvass_debrief":
        message = `${who} filed canvass debrief — ${details.doorsKnocked ?? 0} doors`;
        icon = "clipboard"; category = "canvass";
        break;
      case "canvass_assigned":
        message = `${who} assigned a volunteer to a turf`;
        icon = "map-pin"; category = "canvass";
        break;
      case "bulk_update":
        message = `${who} bulk-updated ${details.count ?? 0} contacts`;
        icon = "users"; category = "canvass";
        break;
      case "sign_intelligence":
        const signType = details.signType as string;
        message = signType === "our_sign" ? `🟢 Our sign spotted at ${details.address ?? ""}` :
                  signType === "opponent_sign" ? `🔴 Opponent sign at ${details.address ?? ""}` :
                  `Sign intel logged at ${details.address ?? ""}`;
        icon = "flag"; category = "sign";
        break;
      case "election_won":
        message = "🎉 ELECTION WON!";
        icon = "trophy"; category = "system";
        break;
      case "election_lost":
        message = "Campaign concluded. Thank you for running.";
        icon = "flag"; category = "system";
        break;
      default:
        message = `${who}: ${a.action.replace(/_/g, " ")}`;
        icon = "activity"; category = "system";
    }

    return {
      id: a.id,
      message,
      icon,
      category,
      who,
      time,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
    };
  });

  return NextResponse.json({
    feed,
    count: feed.length,
    latestTimestamp: feed[0]?.time ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
