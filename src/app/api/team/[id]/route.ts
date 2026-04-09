import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { sendPushBatch, configureWebPush } from "@/lib/notifications/push";
import { resolveNotificationRecipients, getPushSubscriptionsForUsers } from "@/lib/notifications/routing";

const ASSIGNABLE_ROLES: Role[] = [
  Role.ADMIN,
  Role.CAMPAIGN_MANAGER,
  Role.VOLUNTEER_LEADER,
  Role.VOLUNTEER,
];

const updateRoleSchema = z.object({
  campaignId: z.string().min(1),
  role: z.enum(["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER", "VOLUNTEER"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
}).refine((d) => d.role !== undefined || d.status !== undefined, {
  message: "Provide role or status",
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

  const { campaignId, role, status } = parsed.data;
  const forbidden = await requireAdmin(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  // Find target membership, verify it's in this campaign
  const target = await prisma.membership.findUnique({ where: { id: params.id } });
  if (!target || target.campaignId !== campaignId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.userId === session!.user.id) {
    return NextResponse.json({ error: "You cannot change your own membership" }, { status: 400 });
  }
  if (role !== undefined && !ASSIGNABLE_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Role not assignable" }, { status: 400 });
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role as Role;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.membership.update({
      where: { id: params.id },
      data: updateData,
    });

    const action = status === "suspended" ? "team.suspend"
                 : status === "active"    ? "team.reinstate"
                 : "team.updateRole";

    await audit(prisma, action, {
      campaignId,
      userId: session!.user.id,
      entityId: params.id,
      entityType: 'Membership',
      ip: req.headers.get('x-forwarded-for'),
      details: { targetUserId: target.userId, newRole: role, newStatus: status },
    });

    // On suspend: immediately invalidate the target's mobile sessions by bumping sessionVersion
    if (status === "suspended") {
      await prisma.user.update({
        where: { id: target.userId },
        data: { sessionVersion: { increment: 1 } },
      }).catch(() => {}); // non-fatal — web sessions expire naturally

      // Alert recipients via campaign notification routing config
      if (configureWebPush().ok) {
        const recipientIds = await resolveNotificationRecipients(
          campaignId,
          "suspension",
          session!.user.id, // don't notify the person who did it
        );
        if (recipientIds.length > 0) {
          const subscriptions = await getPushSubscriptionsForUsers(recipientIds);
          if (subscriptions.length > 0) {
            const targetUser = await prisma.user.findUnique({
              where: { id: target.userId },
              select: { name: true, email: true },
            });
            await sendPushBatch({
              subscriptions,
              title: "Team member suspended",
              body: `${targetUser?.name ?? targetUser?.email ?? "A team member"} has been suspended from the campaign.`,
              data: { type: "security_alert", campaignId, action: "team.suspend" },
            }).catch(() => {});
          }
        }
      }
    }

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

    await audit(prisma, 'team.remove', {
      campaignId,
      userId: session!.user.id,
      entityId: params.id,
      entityType: 'Membership',
      ip: req.headers.get('x-forwarded-for'),
      details: { removedUserId: target.userId },
    });

    // Immediately invalidate mobile sessions for the removed user
    await prisma.user.update({
      where: { id: target.userId },
      data: { sessionVersion: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({ data: { removed: true } });
  } catch (e) {
    console.error("[team/delete]", e);
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
