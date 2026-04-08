import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { updateTaskSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true, campaignId: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, task.campaignId, "tasks:write");
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed") updateData.completedAt = new Date();
  if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate as string);

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await audit(prisma, 'task.update', {
    campaignId: task.campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: 'Task',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { campaignId: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, task.campaignId, "tasks:write");
  if (forbidden) return forbidden;

  await prisma.task.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), deletedById: session!.user.id },
  });

  await audit(prisma, 'task.delete', {
    campaignId: task.campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: 'Task',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ message: "Task deleted" });
}
