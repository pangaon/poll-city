import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { createIssue } from "@/lib/reputation/issue-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(["misinformation", "policy", "personal_attack", "media_inquiry", "local_controversy", "supporter_concern", "legal", "financial", "general"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  alertIds: z.array(z.string()).optional(),
  ownerUserId: z.string().optional(),
  slaDeadline: z.string().datetime().optional(),
  geography: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const campaignId = params.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const cid = campaignId!;
  const status = params.get("status");
  const category = params.get("category");
  const severity = params.get("severity");
  const ownerUserId = params.get("ownerUserId");
  const overdueOnly = params.get("overdueOnly") === "true";
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(params.get("limit") ?? "50"));

  const where: Record<string, unknown> = { campaignId: cid };
  if (status) where.status = status;
  if (category) where.category = category;
  if (severity) where.severity = severity;
  if (ownerUserId) where.ownerUserId = ownerUserId;
  if (overdueOnly) {
    where.slaDeadline = { lt: new Date() };
    where.status = { notIn: ["resolved", "archived"] };
  }

  const [issues, total] = await Promise.all([
    prisma.reputationIssue.findMany({
      where,
      orderBy: [{ severity: "asc" }, { openedAt: "desc" }],
      take: limit,
      skip: (page - 1) * limit,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        alertLinks: { select: { alertId: true } },
        recommendations: {
          where: { isDismissed: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        responseActions: {
          select: { id: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    }),
    prisma.reputationIssue.count({ where }),
  ]);

  return NextResponse.json({ issues, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, slaDeadline, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const issue = await createIssue({
    campaignId,
    userId: session!.user.id,
    ...rest,
    slaDeadline: slaDeadline ? new Date(slaDeadline) : undefined,
  });

  return NextResponse.json({ issue }, { status: 201 });
}
