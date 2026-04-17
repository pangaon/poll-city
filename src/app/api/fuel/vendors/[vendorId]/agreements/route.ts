import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  title: z.string().min(1).max(300),
  terms: z.string().max(10000).nullish(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  discountPct: z.number().min(0).max(100).nullish(),
  notes: z.string().max(2000).nullish(),
  fileUrl: z.string().url().nullish(),
  signedAt: z.string().datetime().nullish(),
});

export async function GET(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agreements = await prisma.foodVendorAgreement.findMany({
    where: { vendorId: params.vendorId, campaignId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: agreements });
}

export async function POST(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const agreement = await prisma.foodVendorAgreement.create({
    data: {
      vendorId: params.vendorId,
      campaignId: body.campaignId,
      title: body.title.trim(),
      terms: body.terms?.trim() ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      discountPct: body.discountPct ?? null,
      notes: body.notes?.trim() ?? null,
      fileUrl: body.fileUrl ?? null,
      signedAt: body.signedAt ? new Date(body.signedAt) : null,
    },
  });

  return NextResponse.json({ data: agreement }, { status: 201 });
}
