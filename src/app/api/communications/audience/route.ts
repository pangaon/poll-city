import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().min(1),
  channel: z.enum(["email", "sms"]).default("email"),
  supportLevels: z.array(z.string()).optional(),
  wards: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  excludeDnc: z.boolean().default(true),
  volunteerOnly: z.boolean().default(false),
});

// POST /api/communications/audience — counts + samples an audience segment.
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { campaignId, channel, supportLevels, wards, tagIds, excludeDnc, volunteerOnly } = parsed.data;

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where = {
    campaignId,
    deletedAt: null,
    isDeceased: false,
    ...(excludeDnc ? { doNotContact: false } : {}),
    ...(volunteerOnly ? { volunteerInterest: true } : {}),
    ...(channel === "email" ? { email: { not: null } } : { phone: { not: null } }),
    ...(supportLevels && supportLevels.length > 0
      ? { supportLevel: { in: supportLevels as never[] } }
      : {}),
    ...(wards && wards.length > 0 ? { ward: { in: wards } } : {}),
    ...(tagIds && tagIds.length > 0
      ? { tags: { some: { tagId: { in: tagIds } } } }
      : {}),
  };

  const [count, sample] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      take: 5,
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    }),
  ]);

  return NextResponse.json({ count, sample, channel });
}
