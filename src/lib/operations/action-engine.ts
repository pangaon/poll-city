import { TaskPriority, TaskStatus, FunnelStage } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { createBackboneTask } from "./task-backbone";
import { advanceFunnel } from "./funnel-engine";

export type ActionKey =
  | "tasks.create"
  | "gotv.mark_voted"
  | "gotv.dispatch_volunteer";

export interface ActionExecutionContext {
  campaignId: string;
  actorUserId: string;
}

export interface ActionExecutionResult {
  ok: boolean;
  action: ActionKey;
  details: Record<string, unknown>;
}

async function assertCampaignMembership(campaignId: string, actorUserId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: actorUserId, campaignId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Forbidden");
  }
}

export async function executeAction(
  action: ActionKey,
  payload: Record<string, unknown>,
  ctx: ActionExecutionContext,
): Promise<ActionExecutionResult> {
  await assertCampaignMembership(ctx.campaignId, ctx.actorUserId);

  if (action === "tasks.create") {
    const title = String(payload.title ?? "").trim();
    if (!title) throw new Error("title is required");

    const task = await createBackboneTask({
      campaignId: ctx.campaignId,
      actorUserId: ctx.actorUserId,
      title,
      description: typeof payload.description === "string" ? payload.description : null,
      assignedToId: typeof payload.assignedToId === "string" ? payload.assignedToId : null,
      contactId: typeof payload.contactId === "string" ? payload.contactId : null,
      priority: (payload.priority as TaskPriority | undefined) ?? TaskPriority.medium,
      status: (payload.status as TaskStatus | undefined) ?? TaskStatus.pending,
      dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : null,
      sourceAction: "tasks.create",
    });

    return {
      ok: true,
      action,
      details: { taskId: task.id, title: task.title },
    };
  }

  if (action === "gotv.mark_voted") {
    const contactId = String(payload.contactId ?? "");
    if (!contactId) throw new Error("contactId is required");

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, campaignId: true, firstName: true, lastName: true, voted: true },
    });

    if (!contact || contact.campaignId !== ctx.campaignId) {
      throw new Error("Contact not found");
    }

    if (!contact.voted) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { voted: true, votedAt: new Date() },
      });
      // Advance funnel: voted → voter (highest stage)
      await advanceFunnel(contactId, FunnelStage.voter, "marked_voted", ctx.actorUserId);
    }

    await audit(prisma, "action.gotv_mark_voted", {
      campaignId: ctx.campaignId,
      userId: ctx.actorUserId,
      entityId: contactId,
      entityType: "Contact",
      details: {
        alreadyVoted: contact.voted,
        contactName: `${contact.firstName} ${contact.lastName}`.trim(),
      },
    });

    return {
      ok: true,
      action,
      details: {
        contactId,
        alreadyVoted: contact.voted,
        contactName: `${contact.firstName} ${contact.lastName}`.trim(),
      },
    };
  }

  if (action === "gotv.dispatch_volunteer") {
    const precinctId = String(payload.precinctId ?? "").trim();
    const volunteerId = String(payload.volunteerId ?? "").trim();
    const dispatchAction = String(payload.dispatchAction ?? "Cover precinct");
    if (!precinctId || !volunteerId) {
      throw new Error("precinctId and volunteerId are required");
    }

    const task = await createBackboneTask({
      campaignId: ctx.campaignId,
      actorUserId: ctx.actorUserId,
      assignedToId: volunteerId,
      title: `GOTV Dispatch: ${dispatchAction} ${precinctId}`,
      description: typeof payload.notes === "string" ? payload.notes : null,
      priority: TaskPriority.urgent,
      status: TaskStatus.pending,
      dueDate: new Date(),
      sourceAction: "gotv.dispatch_volunteer",
      sourceMetadata: { precinctId, dispatchAction },
    });

    return {
      ok: true,
      action,
      details: {
        taskId: task.id,
        precinctId,
        volunteerId,
      },
    };
  }

  throw new Error(`Unsupported action: ${action}`);
}

