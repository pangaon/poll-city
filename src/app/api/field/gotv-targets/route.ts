import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/gotv-targets?campaignId=X ────────────────────────────────
// Returns contacts confirmed as supporters in canvassing, available for GOTV targeting.
// These are contacts who: have supportLevel strong_support or leaning_support
//   AND have been canvassed (have FieldAttempts with supporter/undecided outcome)
//   AND do NOT have an existing gotv_target FollowUpAction

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const ward = req.nextUrl.searchParams.get("ward");
  const pollDistrict = req.nextUrl.searchParams.get("pollDistrict");

  // Contacts with supporter-level canvass outcomes not yet tagged for GOTV
  const supporters = await prisma.contact.findMany({
    where: {
      campaignId,
      deletedAt: null,
      doNotContact: false,
      supportLevel: { in: ["strong_support", "leaning_support"] },
      ...(ward ? { ward } : {}),
      ...(pollDistrict ? { pollDistrict } : {}),
      // Must have had at least one canvass attempt
      fieldAttempts: {
        some: {
          outcome: { in: ["supporter", "undecided", "contacted"] },
          deletedAt: null,
        },
      },
      // Must NOT already have an active GOTV follow-up
      followUpActions: {
        none: {
          followUpType: "gotv_target",
          status: { notIn: ["completed", "dismissed"] },
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      phone: true,
      ward: true,
      pollDistrict: true,
      supportLevel: true,
      lastContactedAt: true,
    },
    orderBy: [
      { supportLevel: "asc" },
      { lastContactedAt: "asc" },
    ],
    take: 500,
  });

  return NextResponse.json({ data: supporters, total: supporters.length });
}

// ── POST /api/field/gotv-targets ─────────────────────────────────────────────
// Creates GOTV FollowUpActions for a batch of contacts

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    contactIds?: string[];
    assignedToId?: string;
    dueDate?: string;
    notes?: string;
  } | null;

  if (!body?.campaignId || !Array.isArray(body.contactIds) || body.contactIds.length === 0) {
    return NextResponse.json({ error: "campaignId and contactIds are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  // Verify all contacts belong to this campaign
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: body.contactIds },
      campaignId: body.campaignId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No valid contacts found" }, { status: 404 });
  }

  const created = await prisma.$transaction(
    contacts.map((c) =>
      prisma.followUpAction.create({
        data: {
          campaignId: body.campaignId!,
          contactId: c.id,
          followUpType: "gotv_target",
          status: "pending",
          priority: "high",
          assignedToId: body.assignedToId ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes?.trim() ?? null,
        },
      })
    )
  );

  return NextResponse.json({ data: { created: created.length } }, { status: 201 });
}
