import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"] as const;

const filterDefinitionSchema = z.object({
  supportLevels: z.array(z.string()).optional(),
  wards: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  channel: z.enum(["email", "sms", "all"]).optional(),
  volunteerOnly: z.boolean().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  excludeDnc: z.boolean().optional(),
  // Donor filters — matches contacts who have a DonorProfile
  donorOnly: z.boolean().optional(),
  donorTiers: z.array(z.string()).optional(),
  donorStatuses: z.array(z.string()).optional(),
  minLifetimeGiving: z.number().min(0).optional(),
  maxLifetimeGiving: z.number().min(0).optional(),
});

// ─── GET /api/comms/segments ──────────────────────────────────────────────────
// List saved segments for a campaign.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const segments = await prisma.savedSegment.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      filterDefinition: true,
      isDynamic: true,
      lastCount: true,
      lastCountedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ segments });
}

// ─── POST /api/comms/segments ─────────────────────────────────────────────────
// Create a new saved segment.
const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  filterDefinition: filterDefinitionSchema,
  isDynamic: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { campaignId, name, description, filterDefinition, isDynamic } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !MANAGER_ROLES.includes(membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  const segment = await prisma.savedSegment.create({
    data: {
      campaignId,
      createdById: session!.user.id,
      name: sanitizeUserText(name) ?? name,
      description: description ? (sanitizeUserText(description) ?? description) : undefined,
      filterDefinition,
      isDynamic,
    },
    select: {
      id: true,
      name: true,
      description: true,
      filterDefinition: true,
      isDynamic: true,
      lastCount: true,
      lastCountedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ segment }, { status: 201 });
}
