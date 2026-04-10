import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const createSchema = z.object({
  campaignId: z.string(),
  contactId: z.string().optional(),
  fundraisingCampaignId: z.string().optional(),
  pledgedAmount: z.number().positive(),
  pledgeDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const status = sp.get("status");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));

  const [pledges, total] = await Promise.all([
    prisma.pledge.findMany({
      where: { campaignId: campaignId!, ...(status ? { status: status as never } : {}) },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        fundraisingCampaign: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pledge.count({ where: { campaignId: campaignId!, ...(status ? { status: status as never } : {}) } }),
  ]);

  return NextResponse.json({ data: pledges, total, page, pageSize });
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

  const pledge = await prisma.pledge.create({
    data: {
      ...parsed.data,
      pledgeDate: parsed.data.pledgeDate ? new Date(parsed.data.pledgeDate) : new Date(),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ data: pledge }, { status: 201 });
}
