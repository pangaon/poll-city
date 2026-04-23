import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createTaskSchema } from "@/lib/validators";
import { parsePagination, paginate } from "@/lib/utils";
import { TaskCategory, TaskStatus } from "@prisma/client";
import { createBackboneTask } from "@/lib/operations/task-backbone";
import { postTaskCalendarItem } from "@/lib/calendar/post-calendar-item";

/** GET /api/tasks */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { page, pageSize, skip } = parsePagination(sp);
  const status = sp.get("status") as TaskStatus | null;
  const assignedToId = sp.get("assignedToId");
  const category = sp.get("category") as TaskCategory | null;
  const mine = sp.get("mine") === "true";
  const dueBefore = sp.get("dueBefore");
  const dueAfter = sp.get("dueAfter");

  const where = {
    campaignId,
    deletedAt: null,
    ...(status && { status }),
    ...(assignedToId && { assignedToId }),
    ...(mine && { assignedToId: session!.user.id }),
    ...(category && { category }),
    ...(dueBefore || dueAfter ? {
      dueDate: {
        ...(dueAfter && { gte: new Date(dueAfter) }),
        ...(dueBefore && { lte: new Date(dueBefore) }),
      },
    } : {}),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      skip,
      take: pageSize,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, supportLevel: true } },
        parentTask: { select: { id: true, title: true } },
        _count: { select: { followUps: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json(paginate(tasks, total, page, pageSize));
}

/** POST /api/tasks */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const task = await createBackboneTask({
    campaignId: data.campaignId,
    actorUserId: session!.user.id,
    title: data.title,
    description: data.description ?? null,
    assignedToId: data.assignedToId ?? null,
    contactId: data.contactId ?? null,
    parentTaskId: data.parentTaskId ?? null,
    status: data.status,
    priority: data.priority,
    category: data.category,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    isRecurring: data.isRecurring,
    recurringInterval: data.recurringInterval ?? null,
    sourceAction: "tasks.api_create",
  });

  // GAP-010: wire task due date into calendar (non-fatal)
  if (task.dueDate) {
    postTaskCalendarItem({
      campaignId: data.campaignId,
      taskId: task.id,
      title: task.title,
      dueDate: task.dueDate,
      userId: session!.user.id,
    }).catch((err) => console.error("[tasks] calendar wiring failed", err));
  }

  return NextResponse.json({ data: task }, { status: 201 });
}
