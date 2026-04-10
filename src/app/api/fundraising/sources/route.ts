import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const createSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(200),
  sourceType: z.enum(["online_page", "canvass", "event", "direct_mail", "phone_bank", "import", "referral", "other"]).default("other"),
  medium: z.string().optional(),
  campaignCode: z.string().optional(),
  channel: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const sources = await prisma.donationSource.findMany({
    where: { campaignId: campaignId!, active: true },
    include: { _count: { select: { donations: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: sources });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, parsed.data.campaignId);
  if (forbidden) return forbidden;

  const source = await prisma.donationSource.create({ data: parsed.data });
  return NextResponse.json({ data: source }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sourceId = req.nextUrl.searchParams.get("id");
  if (!sourceId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const source = await prisma.donationSource.findUnique({ where: { id: sourceId }, select: { campaignId: true } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, source.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updateSchema = createSchema.partial().omit({ campaignId: true }).extend({
    active: z.boolean().optional(),
  });
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.donationSource.update({ where: { id: sourceId }, data: parsed.data });
  return NextResponse.json({ data: updated });
}
