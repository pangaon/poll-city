import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  summary: z.string().optional(),
  body: z.string().min(1).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  publishStatus: z.enum(["draft", "review", "published", "unpublished", "archived"]).optional(),
  issueId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const page = await prisma.reputationResponsePage.findUnique({
    where: { id: params.id, campaignId: campaignId! },
    include: {
      issue: { select: { id: true, title: true, status: true } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, publishStatus, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const existing = await prisma.reputationResponsePage.findUnique({
    where: { id: params.id, campaignId },
    select: { publishStatus: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { ...rest };
  if (publishStatus) {
    updateData.publishStatus = publishStatus;
    if (publishStatus === "published" && existing.publishStatus !== "published") {
      updateData.publishedAt = new Date();
    }
  }

  const updated = await prisma.reputationResponsePage.update({
    where: { id: params.id },
    data: updateData,
  });

  await audit(prisma, "reputation.page.updated", {
    campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: "ReputationResponsePage",
    before: { publishStatus: existing.publishStatus },
    after: { publishStatus },
  });

  return NextResponse.json({ page: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const existing = await prisma.reputationResponsePage.findUnique({
    where: { id: params.id, campaignId: campaignId! },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reputationResponsePage.update({
    where: { id: params.id },
    data: { publishStatus: "archived" },
  });

  return NextResponse.json({ ok: true });
}
