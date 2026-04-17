import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { AutomationTrigger, AutomationStepType } from "@prisma/client";

// ─── Trigger enrollment ───────────────────────────────────────────────────────

interface TriggerInput {
  campaignId: string;
  contactId: string;
  trigger: AutomationTrigger;
  context?: Record<string, unknown>; // { tagName, segmentId, formId, etc. }
}

/**
 * Called whenever a trigger event fires. Finds all active rules for that
 * trigger in the campaign, checks filter match, and enrolls the contact.
 */
export async function triggerAutomation(input: TriggerInput): Promise<number> {
  const { campaignId, contactId, trigger, context = {} } = input;

  const rules = await prisma.automationRule.findMany({
    where: { campaignId, trigger, isActive: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  let enrolled = 0;
  for (const rule of rules) {
    if (!matchesFilter(rule.triggerFilter, context)) continue;
    if (rule.enrollOnce) {
      const exists = await prisma.automationEnrollment.findUnique({
        where: { ruleId_contactId: { ruleId: rule.id, contactId } },
      });
      if (exists) continue;
    }
    const firstStep = rule.steps[0];
    const nextDueAt = firstStep ? computeNextDue(firstStep.stepType, firstStep.config) : null;
    await prisma.automationEnrollment.upsert({
      where: { ruleId_contactId: { ruleId: rule.id, contactId } },
      create: { ruleId: rule.id, contactId, campaignId, currentStepOrder: 1, nextDueAt },
      update: { status: "active", currentStepOrder: 1, nextDueAt, errorMessage: null },
    });
    enrolled++;
  }
  return enrolled;
}

// ─── Cron processor ──────────────────────────────────────────────────────────

interface ProcessResult {
  processed: number;
  errors: number;
  completed: number;
}

/**
 * Run once per cron tick (hourly recommended). Processes all enrollments
 * whose nextDueAt is in the past.
 */
export async function processAutomationEnrollments(): Promise<ProcessResult> {
  const now = new Date();
  const due = await prisma.automationEnrollment.findMany({
    where: { status: "active", nextDueAt: { lte: now } },
    include: {
      rule: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      contact: { select: { id: true, email: true, firstName: true, campaignId: true } },
    },
    take: 100, // batch cap to avoid timeout
  });

  let processed = 0, errors = 0, completed = 0;

  for (const enrollment of due) {
    try {
      const steps = enrollment.rule.steps;
      const step = steps.find((s) => s.stepOrder === enrollment.currentStepOrder);
      if (!step) {
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", completedAt: now },
        });
        completed++;
        continue;
      }

      // Execute the step
      const result = await executeStep(step, enrollment.contact, enrollment.rule.campaignId);

      // Record completion
      await prisma.automationStepCompletion.upsert({
        where: { enrollmentId_stepId: { enrollmentId: enrollment.id, stepId: step.id } },
        create: { enrollmentId: enrollment.id, stepId: step.id, result: result as Prisma.InputJsonValue },
        update: { completedAt: now, result: result as Prisma.InputJsonValue },
      });

      // Advance to next step
      const nextStep = steps.find((s) => s.stepOrder === enrollment.currentStepOrder + 1);
      if (nextStep) {
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStepOrder: nextStep.stepOrder,
            nextDueAt: computeNextDue(nextStep.stepType, nextStep.config),
          },
        });
      } else {
        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", completedAt: now },
        });
        completed++;
      }
      processed++;
    } catch (err) {
      await prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "errored", errorMessage: String(err) },
      });
      errors++;
    }
  }

  return { processed, errors, completed };
}

// ─── Step executor ────────────────────────────────────────────────────────────

interface StepContact {
  id: string;
  email: string | null;
  firstName: string | null;
  campaignId: string;
}

async function executeStep(
  step: { id: string; stepType: AutomationStepType; config: Prisma.JsonValue },
  contact: StepContact,
  campaignId: string,
): Promise<Record<string, unknown>> {
  const cfg = (step.config ?? {}) as Record<string, unknown>;

  switch (step.stepType) {
    case "send_email": {
      if (!contact.email || !cfg.templateId) return { skipped: true, reason: "no email or templateId" };
      const template = await prisma.messageTemplate.findFirst({
        where: { id: String(cfg.templateId), campaignId },
      });
      if (!template) return { skipped: true, reason: "template not found" };
      // Create a ScheduledMessage for immediate delivery (send in 1 minute)
      const sendAt = new Date(Date.now() + 60_000);
      await prisma.scheduledMessage.create({
        data: {
          campaignId,
          createdById: contact.id, // system-created; use contact as proxy sender
          channel: "email",
          subject: template.subject ?? `Message for ${contact.firstName ?? "you"}`,
          bodyHtml: template.bodyHtml ?? undefined,
          bodyText: template.bodyText ?? "",
          sendAt,
          sendKey: `auto-${step.id}-${contact.id}-${Date.now()}`,
          templateId: template.id,
        },
      });
      return { scheduled: true, sendAt };
    }

    case "send_sms": {
      if (!cfg.templateId) return { skipped: true, reason: "no templateId" };
      const template = await prisma.messageTemplate.findFirst({
        where: { id: String(cfg.templateId), campaignId, channel: "sms" },
      });
      if (!template) return { skipped: true, reason: "template not found" };
      const sendAt = new Date(Date.now() + 60_000);
      await prisma.scheduledMessage.create({
        data: {
          campaignId,
          createdById: contact.id,
          channel: "sms",
          bodyText: template.bodyText ?? "",
          sendAt,
          sendKey: `auto-sms-${step.id}-${contact.id}-${Date.now()}`,
          templateId: template.id,
        },
      });
      return { scheduled: true, sendAt };
    }

    case "wait_days":
      // wait_days steps are pure timers — computeNextDue handles the delay.
      // Nothing to execute; just record completion and move on.
      return { waited: true, days: cfg.days ?? 0 };

    case "add_tag": {
      if (!cfg.tagName) return { skipped: true, reason: "no tagName" };
      const existing = await prisma.contact.findUnique({
        where: { id: contact.id },
        select: { tags: true },
      });
      const tags = (existing?.tags ?? []) as string[];
      if (!tags.includes(String(cfg.tagName))) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { tags: [...tags, String(cfg.tagName)] },
        });
      }
      return { tagged: cfg.tagName };
    }

    case "remove_tag": {
      if (!cfg.tagName) return { skipped: true, reason: "no tagName" };
      const existing = await prisma.contact.findUnique({
        where: { id: contact.id },
        select: { tags: true },
      });
      const tags = ((existing?.tags ?? []) as string[]).filter((t) => t !== cfg.tagName);
      await prisma.contact.update({ where: { id: contact.id }, data: { tags } });
      return { untagged: cfg.tagName };
    }

    case "add_to_segment":
    case "remove_from_segment":
      // SavedSegments are query-based, not membership lists — these are no-ops.
      return { skipped: true, reason: "segments are query-based" };

    default:
      return { skipped: true, reason: "unknown step type" };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeNextDue(stepType: AutomationStepType, config: Prisma.JsonValue): Date {
  const cfg = (config ?? {}) as Record<string, unknown>;
  if (stepType === "wait_days") {
    const days = Number(cfg.days ?? 1);
    return new Date(Date.now() + days * 86_400_000);
  }
  // All non-wait steps are due immediately (+ 30 sec buffer)
  return new Date(Date.now() + 30_000);
}

function matchesFilter(filter: Prisma.JsonValue, context: Record<string, unknown>): boolean {
  const f = (filter ?? {}) as Record<string, unknown>;
  if (Object.keys(f).length === 0) return true; // no filter = match all
  for (const [key, val] of Object.entries(f)) {
    if (context[key] !== val) return false;
  }
  return true;
}
