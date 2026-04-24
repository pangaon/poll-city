import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { createCampaignSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { Role } from "@prisma/client";

/** GET /api/campaigns — list campaigns for current user */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  if (isSuperAdmin) {
    const campaigns = await prisma.campaign.findMany({
      include: { _count: { select: { contacts: { where: { deletedAt: null } }, tasks: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: campaigns.map((c) => ({ ...c, userRole: Role.ADMIN })) });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session!.user.id },
    include: {
      campaign: {
        include: { _count: { select: { contacts: { where: { deletedAt: null } }, tasks: { where: { deletedAt: null } } } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({ data: memberships.map((m) => ({ ...m.campaign, userRole: m.role })) });
}

/** POST /api/campaigns — create campaign (admin only) */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req); // Any authenticated user can create a campaign — they become ADMIN
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      slug,
      candidateEmail: data.candidateEmail || null,
      electionDate: data.electionDate ? new Date(data.electionDate) : null,
      memberships: {
        create: { userId: session!.user.id, role: Role.ADMIN },
      },
    },
  });

  // Seed default permission roles for the new campaign
  try {
    const { seedDefaultRoles } = await import("@/lib/permissions/engine");
    await seedDefaultRoles(campaign.id);

    // Link the creator to the admin role
    const adminRole = await prisma.campaignRole.findFirst({
      where: { campaignId: campaign.id, slug: "admin" },
    });
    if (adminRole) {
      await prisma.membership.update({
        where: { userId_campaignId: { userId: session!.user.id, campaignId: campaign.id } },
        data: { campaignRoleId: adminRole.id, trustLevel: 5 },
      });
    }
  } catch (e) {
    console.error("[Campaign Create] Failed to seed roles:", e);
  }

  await prisma.activityLog.create({
    data: {
      campaignId: campaign.id,
      userId: session!.user.id,
      action: "created",
      entityType: "campaign",
      entityId: campaign.id,
      details: { name: campaign.name },
    },
  });

  return NextResponse.json({ data: campaign }, { status: 201 });
}
