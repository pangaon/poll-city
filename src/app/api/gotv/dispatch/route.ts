/**
 * POST /api/gotv/dispatch — Assign a volunteer to a precinct from the race board.
 *
 * George's spec: "One-tap Dispatch button. Select volunteer → assigned immediately.
 * Card shows their avatar."
 *
 * GET — List available volunteers for dispatch
 * POST — Assign volunteer to precinct
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { TaskPriority, TaskStatus } from "@prisma/client";

/** GET — Available volunteers for dispatch dropdown */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const volunteers = await prisma.membership.findMany({
    where: { campaignId, status: "active" },
    include: { user: { select: { id: true, name: true, email: true } } },
    take: 100,
  });

  return NextResponse.json({
    volunteers: volunteers.map((v) => ({
      id: v.userId,
      name: v.user.name ?? v.user.email?.split("@")[0] ?? "Volunteer",
      email: v.user.email,
      avatar: null,
      role: v.role,
    })),
  });
}

/** POST — Dispatch volunteer to a precinct */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { campaignId, precinctId, volunteerId, action } = await req.json();
  if (!campaignId || !precinctId || !volunteerId) {
    return NextResponse.json({ error: "campaignId, precinctId, and volunteerId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get volunteer info
  const volunteer = await prisma.user.findUnique({
    where: { id: volunteerId },
    select: { name: true, email: true },
  });

  // Create a task for the dispatch
  const task = await prisma.task.create({
    data: {
      campaignId,
      title: `GOTV Dispatch: ${action ?? "Cover"} ${precinctId}`,
      assignedToId: volunteerId,
      createdById: session!.user.id,
      priority: TaskPriority.urgent,
      status: TaskStatus.pending,
      dueDate: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "gotv_dispatch",
      entityType: "Task",
      entityId: task.id,
      details: {
        precinctId,
        volunteerId,
        volunteerName: volunteer?.name ?? volunteer?.email,
        action: action ?? "Cover precinct",
      },
    },
  });

  return NextResponse.json({
    ok: true,
    dispatch: {
      taskId: task.id,
      precinctId,
      volunteer: { id: volunteerId, name: volunteer?.name ?? "Volunteer" },
    },
  });
}
