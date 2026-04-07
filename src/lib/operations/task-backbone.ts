import { TaskPriority, TaskStatus } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";

export interface CreateTaskBackboneInput {
  campaignId: string;
  actorUserId: string;
  title: string;
  description?: string | null;
  assignedToId?: string | null;
  contactId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date | null;
  sourceAction?: string;
  sourceMetadata?: Record<string, unknown>;
}

async function assertMembership(userId: string, campaignId: string): Promise<void> {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Forbidden");
  }
}

export async function createBackboneTask(input: CreateTaskBackboneInput) {
  await assertMembership(input.actorUserId, input.campaignId);

  if (input.assignedToId) {
    await assertMembership(input.assignedToId, input.campaignId);
  }

  const task = await prisma.task.create({
    data: {
      campaignId: input.campaignId,
      createdById: input.actorUserId,
      title: input.title,
      description: input.description ?? null,
      assignedToId: input.assignedToId ?? null,
      contactId: input.contactId ?? null,
      priority: input.priority ?? TaskPriority.medium,
      status: input.status ?? TaskStatus.pending,
      dueDate: input.dueDate ?? null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await audit(prisma, "task.create_backbone", {
    campaignId: input.campaignId,
    userId: input.actorUserId,
    entityId: task.id,
    entityType: "Task",
    details: {
      title: task.title,
      sourceAction: input.sourceAction ?? "manual",
      ...input.sourceMetadata,
    },
  });

  return task;
}

export async function assignBackboneTask(input: {
  taskId: string;
  campaignId: string;
  actorUserId: string;
  assignedToId: string;
}) {
  await assertMembership(input.actorUserId, input.campaignId);
  await assertMembership(input.assignedToId, input.campaignId);

  const updated = await prisma.task.update({
    where: { id: input.taskId },
    data: {
      assignedToId: input.assignedToId,
      status: TaskStatus.in_progress,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await audit(prisma, "task.assign_backbone", {
    campaignId: input.campaignId,
    userId: input.actorUserId,
    entityId: updated.id,
    entityType: "Task",
    details: { assignedToId: input.assignedToId },
  });

  return updated;
}

