import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";

const ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.CAMPAIGN_MANAGER,
  Role.VOLUNTEER_LEADER,
  Role.VOLUNTEER,
];

const updateRoleSchema = z.object({
  campaignId: z.string().min(1),
  role: z.enum(["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER", "VOLUNTEER"]),
});

async function requireAdmin(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.role !== "ADMIN" && membership.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only campaign admins can manage the team" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, role } = parsed.data;
  const forbidden = await requireAdmin(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  // Find target membership, verify it's in this campaign
  const target = await prisma.membership.findUnique({ where: { id: params.id } });
  if (!target || target.campaignId !== campaignId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.userId === session!.user.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  if (!ASSIGNABLE_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Role not assignable" }, { status: 400 });
  }

  try {
    const updated = await prisma.membership.update({
      where: { id: params.id },
      data: { role: role as Role },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[team/patch]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const forbidden = await requireAdmin(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  const target = await prisma.membership.findUnique({ where: { id: params.id } });
  if (!target || target.campaignId !== campaignId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.userId === session!.user.id) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  try {
    await prisma.membership.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { removed: true } });
  } catch (e) {
    console.error("[team/delete]", e);
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
