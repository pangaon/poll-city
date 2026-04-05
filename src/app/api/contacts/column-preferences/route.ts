import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

const saveSchema = z.object({
  campaignId: z.string().min(1),
  tableKey: z.string().min(1).default("contacts"),
  order: z.array(z.string().min(1)),
  hidden: z.array(z.string().min(1)),
  widths: z.record(z.string(), z.number().int().min(60).max(1200)),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const tableKey = req.nextUrl.searchParams.get("tableKey") ?? "contacts";

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pref = await prisma.crmColumnPreference.findUnique({
    where: {
      campaignId_userId_tableKey: {
        campaignId,
        userId: session!.user.id,
        tableKey,
      },
    },
  });

  return NextResponse.json({ data: pref ?? null });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: payload.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const saved = await prisma.crmColumnPreference.upsert({
    where: {
      campaignId_userId_tableKey: {
        campaignId: payload.campaignId,
        userId: session!.user.id,
        tableKey: payload.tableKey,
      },
    },
    create: {
      campaignId: payload.campaignId,
      userId: session!.user.id,
      tableKey: payload.tableKey,
      order: payload.order,
      hidden: payload.hidden,
      widths: payload.widths,
    },
    update: {
      order: payload.order,
      hidden: payload.hidden,
      widths: payload.widths,
    },
  });

  return NextResponse.json({ data: saved });
}
