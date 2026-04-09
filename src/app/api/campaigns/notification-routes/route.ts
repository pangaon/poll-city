/**
 * Campaign Notification Routes
 *
 * GET  — returns the current notification routing config for the campaign
 * PATCH — updates routing for one or more alert types
 *
 * Allows campaign admins to designate who receives which push notification types.
 * Small campaigns ("everyone gets everything") set mode: "all".
 * Larger campaigns route to specific roles or named users.
 *
 * Auth: ADMIN only
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import type { AlertType } from "@/lib/notifications/routing";

const VALID_ALERT_TYPES: AlertType[] = [
  "team_activity_alert",
  "security_alert",
  "milestone",
  "suspension",
  "sign_deployed",
  "gotv_milestone",
];

const routeConfigSchema = z.object({
  mode: z.enum(["roles", "users", "all"]),
  roles: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

const patchSchema = z.object({
  campaignId: z.string().min(1),
  routes: z.record(z.string(), routeConfigSchema),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { notificationRoutes: true },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      routes: campaign.notificationRoutes ?? {},
      validAlertTypes: VALID_ALERT_TYPES,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, routes } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  // Validate alert type keys
  const invalidKeys = Object.keys(routes).filter((k) => !VALID_ALERT_TYPES.includes(k as AlertType));
  if (invalidKeys.length > 0) {
    return NextResponse.json({ error: `Invalid alert types: ${invalidKeys.join(", ")}` }, { status: 400 });
  }

  // Merge with existing routes (don't overwrite types not included in this PATCH)
  const existing = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { notificationRoutes: true },
  });
  const existingRoutes = (existing?.notificationRoutes ?? {}) as Record<string, object>;
  const merged: Record<string, object> = { ...existingRoutes, ...routes };

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { notificationRoutes: merged as never },
  });

  return NextResponse.json({ data: { routes: merged } });
}
