import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { updateTaskSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "tasks:write");
  if (permError) return permError;

  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true, campaignId: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: task.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "tasks:write");
  if (permError2) return permError2;

  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { campaignId: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: task.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Task deleted" });
}
