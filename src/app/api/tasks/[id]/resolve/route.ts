import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { resolveTaskSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { createBackboneTask } from "@/lib/operations/task-backbone";
import { aiAssist } from "@/lib/ai";
import { InteractionType } from "@prisma/client";

const ADONI_RESOLVE_PROMPT = `You are Adoni, Poll City's campaign operations assistant. You speak in warm, direct Canadian English. No markdown. No bullet points. No headers. Maximum 3 sentences. Write as a senior campaign manager giving advice after a task is resolved.`;

function buildAdoniPrompt(taskTitle: string, resolutionType: string, contactName: string | null): string {
  const contact = contactName ? `for ${contactName}` : "";
  return `A campaign task "${taskTitle}" ${contact} was just resolved with outcome: ${resolutionType.replace(/_/g, " ").toLowerCase()}. Suggest the best next step in 1-2 sentences, then offer a specific follow-up action if relevant. Write in Adoni's voice — warm, direct, no fluff.`;
}

const DETERMINISTIC_SUGGESTIONS: Record<string, { message: string; followUpTitle?: string; followUpDueDays?: number }> = {
  VOICEMAIL_LEFT: {
    message: "Good instinct leaving a message. Give it two or three days before trying again — if they haven't called back by then, a second attempt is worth your time.",
    followUpTitle: "Follow-up call",
    followUpDueDays: 3,
  },
  NOT_REACHED: {
    message: "No answer happens. Try at a different time of day — evenings before 8pm tend to work well for local candidates. Mark this one for another attempt in 48 hours.",
    followUpTitle: "Retry call",
    followUpDueDays: 2,
  },
  MET_IN_PERSON: {
    message: "That's a strong touchpoint. Log the conversation in their contact record while it's fresh, and think about whether they're a supporter worth cultivating further.",
    followUpTitle: "Log interaction and follow up",
    followUpDueDays: 1,
  },
  EMAIL_SENT: {
    message: "Good. Give it 48 hours. If there's no response by then, a short follow-up email or a call is the right move — don't let it go cold.",
    followUpTitle: "Email follow-up check",
    followUpDueDays: 2,
  },
  RECRUITED: {
    message: "Excellent work. New volunteers need to feel welcomed quickly or they go quiet. Get them into your next orientation or team chat within the next few days.",
    followUpTitle: "Volunteer orientation / onboarding",
    followUpDueDays: 4,
  },
  DECLINED: {
    message: "Noted. Don't chase it — their time will come if the campaign goes well. Flag them as undecided rather than opposed, and focus your energy where the doors are open.",
    followUpTitle: undefined,
    followUpDueDays: undefined,
  },
  FOLLOW_UP_NEEDED: {
    message: "Set a clear reminder or it won't happen. A specific date and owner is the difference between a follow-up and a forgotten task.",
    followUpTitle: "Follow up on this task",
    followUpDueDays: 3,
  },
  BLOCKED: {
    message: "A blocked task is a risk to your timeline. Name what's blocking it and who can unblock it right now — don't let this sit without an owner.",
    followUpTitle: "Unblock and escalate",
    followUpDueDays: 1,
  },
  DELEGATED: {
    message: "Delegated is not done. Make sure the new owner knows the deadline and has everything they need. Check in on it in a few days.",
    followUpTitle: "Check in on delegated task",
    followUpDueDays: 3,
  },
  COMPLETED: {
    message: "Task done. Well run. Keep moving — your next priority is waiting.",
    followUpTitle: undefined,
    followUpDueDays: undefined,
  },
  WRONG_NUMBER: {
    message: "Wrong number — update their contact record now so no one wastes time calling it again. Check if there's a second number on file.",
    followUpTitle: "Update contact info",
    followUpDueDays: 1,
  },
  WONT_DO: {
    message: "Marking something won't-do is a valid decision. Just make sure it was a conscious call and not a slip — if it still matters, someone should own it.",
    followUpTitle: undefined,
    followUpDueDays: undefined,
  },
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const task = await prisma.task.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, task.campaignId, "tasks:write");
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = resolveTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { resolutionType, resolutionNote, createFollowUp, followUpTitle, followUpDueDays, followUpAssignedToId } = parsed.data;

  const isTerminal = ["COMPLETED", "WONT_DO", "WRONG_NUMBER", "DECLINED"].includes(resolutionType);

  // Update the task
  const updatedTask = await prisma.task.update({
    where: { id: params.id },
    data: {
      resolutionType,
      resolutionNote: resolutionNote ?? null,
      status: isTerminal ? "completed" : "pending",
      completedAt: isTerminal ? new Date() : null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true, supportLevel: true } },
      parentTask: { select: { id: true, title: true } },
      _count: { select: { followUps: true } },
    },
  });

  // Log contact interaction if linked
  if (task.contactId && ["MET_IN_PERSON", "VOICEMAIL_LEFT", "EMAIL_SENT", "NOT_REACHED", "RECRUITED"].includes(resolutionType)) {
    const typeMap: Record<string, InteractionType> = {
      MET_IN_PERSON: InteractionType.field_encounter,
      VOICEMAIL_LEFT: InteractionType.phone_call,
      EMAIL_SENT: InteractionType.email,
      NOT_REACHED: InteractionType.phone_call,
      RECRUITED: InteractionType.follow_up,
    };
    await prisma.interaction.create({
      data: {
        contactId: task.contactId,
        userId: session!.user.id,
        type: typeMap[resolutionType] ?? InteractionType.note,
        notes: `Task resolved: ${task.title}${resolutionNote ? ` — ${resolutionNote}` : ""}`,
        source: "canvass",
      },
    }).catch(() => {});
    await prisma.contact.update({
      where: { id: task.contactId },
      data: { lastContactedAt: new Date() },
    }).catch(() => {});
  }

  // Create follow-up task if requested
  let followUpTask = null;
  if (createFollowUp && followUpTitle) {
    const dueDays = followUpDueDays ?? 3;
    const due = new Date();
    due.setDate(due.getDate() + dueDays);
    followUpTask = await createBackboneTask({
      campaignId: task.campaignId,
      actorUserId: session!.user.id,
      title: followUpTitle,
      assignedToId: followUpAssignedToId ?? task.assignedToId ?? null,
      contactId: task.contactId ?? null,
      parentTaskId: task.id,
      priority: task.priority,
      category: task.category,
      dueDate: due,
      sourceAction: "tasks.resolve_follow_up",
    });
  }

  // Generate Adoni suggestion
  const deterministic = DETERMINISTIC_SUGGESTIONS[resolutionType];
  let adoniMessage = deterministic?.message ?? "Good work getting that done. Keep moving forward.";
  const suggestedFollowUpTitle = followUpTitle ?? deterministic?.followUpTitle;
  const suggestedFollowUpDueDays = followUpDueDays ?? deterministic?.followUpDueDays;

  // Try AI-enhanced suggestion if API key available
  if (!aiAssist.isMockMode()) {
    const contactName = task.contact ? `${task.contact.firstName} ${task.contact.lastName}` : null;
    await aiAssist.complete({
      systemPrompt: ADONI_RESOLVE_PROMPT,
      messages: [{ role: "user", content: buildAdoniPrompt(task.title, resolutionType, contactName) }],
      maxTokens: 120,
      temperature: 0.7,
    }).then(r => { adoniMessage = r.text.trim(); }).catch(() => {});
  }

  await audit(prisma, "task.resolve", {
    campaignId: task.campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: "Task",
    details: { resolutionType, createFollowUp, followUpTaskId: followUpTask?.id },
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({
    data: updatedTask,
    adoni: {
      message: adoniMessage,
      suggestedFollowUpTitle,
      suggestedFollowUpDueDays,
      followUpCreated: !!followUpTask,
      followUpTask,
    },
  });
}
