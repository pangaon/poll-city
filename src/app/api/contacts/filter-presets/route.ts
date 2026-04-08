import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Saved filter presets for the contacts page.
 * Also returns 4 built-in defaults that work on every campaign.
 */

const BUILTIN_PRESETS: Array<{ id: string; name: string; filters: Record<string, unknown>; isDefault: true }> = [
  {
    id: "builtin-gotv-priority-1",
    name: "GOTV Priority 1",
    isDefault: true,
    filters: {
      supportLevels: ["strong_support"],
      doNotContact: false,
      gotvMin: 75,
    },
  },
  {
    id: "builtin-never-contacted",
    name: "Never Contacted",
    isDefault: true,
    filters: {
      interactionCountMax: 0,
    },
  },
  {
    id: "builtin-supporters-no-phone",
    name: "Supporters — No Phone",
    isDefault: true,
    filters: {
      supportLevels: ["strong_support", "leaning_support"],
      hasPhone: false,
    },
  },
  {
    id: "builtin-potential-volunteers",
    name: "Potential Volunteers",
    isDefault: true,
    filters: {
      volunteerInterest: true,
    },
  },
];

const saveSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const saved = await prisma.contactFilterPreset.findMany({
    where: { campaignId },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({
    data: {
      builtin: BUILTIN_PRESETS,
      saved: saved.map((p) => ({
        id: p.id,
        name: p.name,
        filters: p.filters,
        isDefault: false,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const raw = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, name, filters } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const created = await prisma.contactFilterPreset.create({
      data: {
        campaignId,
        userId: session!.user.id,
        name: name.trim(),
        filters: filters as object,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[filter-presets/create]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
