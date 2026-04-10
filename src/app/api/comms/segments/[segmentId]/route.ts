import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"] as const;

async function resolveSegment(segmentId: string, userId: string) {
  const segment = await prisma.savedSegment.findUnique({
    where: { id: segmentId, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!segment) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: segment.campaignId } },
  });
  return membership ? { segment, membership } : null;
}

// ─── PUT /api/comms/segments/[segmentId] ─────────────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  filterDefinition: z
    .object({
      supportLevels: z.array(z.string()).optional(),
      wards: z.array(z.string()).optional(),
      tagIds: z.array(z.string()).optional(),
      channel: z.enum(["email", "sms", "all"]).optional(),
      volunteerOnly: z.boolean().optional(),
      hasEmail: z.boolean().optional(),
      hasPhone: z.boolean().optional(),
      excludeDnc: z.boolean().optional(),
    })
    .optional(),
  isDynamic: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { segmentId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveSegment(params.segmentId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, description, filterDefinition, isDynamic } = parsed.data;

  const segment = await prisma.savedSegment.update({
    where: { id: params.segmentId },
    data: {
      ...(name !== undefined ? { name: sanitizeUserText(name) ?? name } : {}),
      ...(description !== undefined
        ? { description: description ? (sanitizeUserText(description) ?? description) : null }
        : {}),
      ...(filterDefinition !== undefined ? { filterDefinition, lastCount: null, lastCountedAt: null } : {}),
      ...(isDynamic !== undefined ? { isDynamic } : {}),
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

  return NextResponse.json({ segment });
}

// ─── DELETE /api/comms/segments/[segmentId] ───────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { segmentId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveSegment(params.segmentId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  await prisma.savedSegment.update({
    where: { id: params.segmentId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
