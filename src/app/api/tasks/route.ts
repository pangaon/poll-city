import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createTaskSchema } from "@/lib/validators";
import { parsePagination, paginate } from "@/lib/utils";
import { TaskStatus } from "@prisma/client";
import { createBackboneTask } from "@/lib/operations/task-backbone";

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
  const mine = sp.get("mine") === "true";

  const where = {
    campaignId,
    ...(status && { status }),
    ...(assignedToId && { assignedToId }),
    ...(mine && { assignedToId: session!.user.id }),
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
        contact: { select: { id: true, firstName: true, lastName: true } },
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
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    sourceAction: "tasks.api_create",
  });

  return NextResponse.json({ data: task }, { status: 201 });
}
