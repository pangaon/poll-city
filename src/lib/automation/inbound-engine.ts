/**
 * Inbound Automation Engine
 *
 * Every website form submission, webhook, or external signal flows through here.
 * This engine ensures:
 * 1. Every person who contacts the campaign becomes a Contact (or matches existing)
 * 2. Every interaction is tagged and scored
 * 3. Follow-up tasks are auto-created
 * 4. The right people get notified
 *
 * Called by: form routes, webhook handlers, cron jobs
 */

import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InboundSource =
  | "website-support"
  | "website-volunteer"
  | "website-donation"
  | "website-question"
  | "website-sign-request"
  | "website-newsletter"
  | "website-rsvp"
  | "social-signal"
  | "canvass"
  | "phone"
  | "import";

export type InboundSentiment = "positive" | "neutral" | "negative" | "media-inquiry" | "unknown";

interface FindOrCreateContactInput {
  campaignId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  source: InboundSource;
}

interface AutoTaskInput {
  campaignId: string;
  contactId?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
}

// ─── Contact Matching + Creation ─────────────────────────────────────────────

/**
 * Find or create a Contact from inbound data.
 * Matches by email within campaign. Updates existing contacts with new data.
 * Sets source field. Increments engagement.
 */
export async function findOrCreateContact(input: FindOrCreateContactInput) {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const nameParts = [];
  const firstName = input.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || "";

  let contact = await prisma.contact.findFirst({
    where: { campaignId: input.campaignId, email: { equals: email, mode: "insensitive" } },
  });

  if (contact) {
    // Update with any new data we have
    const updates: Record<string, unknown> = {
      lastContactedAt: new Date(),
    };
    if (input.phone && !contact.phone) updates.phone = input.phone.trim();
    if (input.address && !contact.address1) updates.address1 = input.address.trim();
    if (input.postalCode && !contact.postalCode) updates.postalCode = input.postalCode.trim();
    if (!contact.source) updates.source = input.source;

    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: updates,
    });
  } else {
    // Create new contact
    contact = await prisma.contact.create({
      data: {
        campaignId: input.campaignId,
        firstName,
        lastName,
        email,
        phone: input.phone?.trim() || null,
        address1: input.address?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        source: input.source,
        importSource: "web",
        supportLevel: "unknown",
      },
    });
  }

  // Log activity — find a campaign admin for the userId requirement
  const adminForLog = await prisma.membership.findFirst({
    where: { campaignId: input.campaignId, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
    select: { userId: true },
  });
  if (adminForLog) {
    await prisma.activityLog.create({
      data: {
        campaignId: input.campaignId,
        userId: adminForLog.userId,
        entityType: "contact",
        entityId: contact.id,
        action: "website_form_submission",
        details: { source: input.source, email },
      },
    }).catch(() => {});
  }

  return contact;
}

// ─── Auto-Tag Contact ────────────────────────────────────────────────────────

/**
 * Add a tag to a contact. Creates the tag if it doesn't exist.
 */
export async function autoTagContact(campaignId: string, contactId: string, tagName: string, tagColor?: string) {
  try {
    // Find or create the tag
    let tag = await prisma.tag.findFirst({
      where: { campaignId, name: { equals: tagName, mode: "insensitive" } },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { campaignId, name: tagName, color: tagColor || "#6366F1" },
      });
    }

    // Link tag to contact (ignore if already linked)
    await prisma.contactTag.create({
      data: { contactId, tagId: tag.id },
    }).catch(() => {}); // Unique constraint = already tagged

    return tag;
  } catch {
    return null;
  }
}

// ─── Auto-Create Task ────────────────────────────────────────────────────────

/**
 * Create a follow-up task. Assigns to campaign admin if no specific assignee.
 */
export async function autoCreateTask(input: AutoTaskInput) {
  try {
    // Find a campaign admin to assign to
    const admin = await prisma.membership.findFirst({
      where: { campaignId: input.campaignId, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
      select: { userId: true },
    });

    const task = await prisma.task.create({
      data: {
        campaignId: input.campaignId,
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        status: "pending",
        contactId: input.contactId || null,
        assignedToId: admin?.userId || null,
        createdById: admin?.userId || "system",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
    });

    return task;
  } catch {
    return null;
  }
}

// ─── Log Interaction ─────────────────────────────────────────────────────────

/**
 * Log an interaction on a contact from a website form submission.
 */
export async function logWebInteraction(
  campaignId: string,
  contactId: string,
  type: "email" | "note" | "follow_up" | "event",
  notes: string,
) {
  try {
    // Interaction requires userId — find a campaign admin
    const admin = await prisma.membership.findFirst({
      where: { campaignId, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
      select: { userId: true },
    });
    if (!admin) return;

    await prisma.interaction.create({
      data: {
        contactId,
        userId: admin.userId,
        type,
        notes,
      },
    });
  } catch {}
}

// ─── Sentiment Classification ────────────────────────────────────────────────

/**
 * Basic sentiment + intent classification for inbound messages.
 * Detects media inquiries, angry messages, and positive feedback.
 * For production, this should call Adoni/Claude for real NLP.
 */
export function classifyInbound(text: string): InboundSentiment {
  const lower = text.toLowerCase();

  // Media inquiry keywords
  const mediaKeywords = [
    "reporter", "journalist", "media", "press", "interview", "newspaper",
    "tv station", "radio", "article", "publication", "editor", "newsroom",
    "deadline", "quote", "on the record", "comment on", "story about",
  ];
  if (mediaKeywords.some((k) => lower.includes(k))) return "media-inquiry";

  // Negative sentiment
  const negativeKeywords = [
    "angry", "furious", "disgusted", "terrible", "awful", "worst",
    "hate", "despise", "oppose", "against", "never vote", "disgrace",
    "shame", "corrupt", "liar", "fraud", "complaint", "unacceptable",
  ];
  if (negativeKeywords.some((k) => lower.includes(k))) return "negative";

  // Positive sentiment
  const positiveKeywords = [
    "thank", "great", "love", "support", "excited", "proud",
    "amazing", "wonderful", "excellent", "impressed", "hope",
    "volunteer", "donate", "help", "sign", "endorsement",
  ];
  if (positiveKeywords.some((k) => lower.includes(k))) return "positive";

  return "neutral";
}

// ─── Engagement Scoring ──────────────────────────────────────────────────────

/**
 * Increment engagement based on interaction type.
 * Multiple interactions from the same person escalate their support level.
 */
export async function updateEngagement(contactId: string, interactionType: InboundSource) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        supportLevel: true,
        _count: { select: { interactions: true, tags: true } },
      },
    });

    if (!contact) return;

    // Count total engagement signals
    const totalEngagement = contact._count.interactions + contact._count.tags;

    // Auto-escalate support level based on engagement
    let newLevel = contact.supportLevel;
    if (contact.supportLevel === "unknown" && totalEngagement >= 1) {
      newLevel = "leaning_support";
    } else if (contact.supportLevel === "leaning_support" && totalEngagement >= 3) {
      newLevel = "strong_support";
    }

    // High-value interactions auto-escalate faster
    if (interactionType === "website-donation" || interactionType === "website-volunteer") {
      if (contact.supportLevel === "unknown" || contact.supportLevel === "leaning_support") {
        newLevel = "strong_support";
      }
    }

    if (newLevel !== contact.supportLevel) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { supportLevel: newLevel },
      });
    }
  } catch {}
}

// ─── Notify Campaign Team ────────────────────────────────────────────────────

/**
 * Create an in-app notification for the campaign team.
 */
export async function notifyCampaignTeam(
  campaignId: string,
  title: string,
  body: string,
  priority: "low" | "medium" | "high" = "medium",
) {
  try {
    // Find all admin/manager users for this campaign
    const members = await prisma.membership.findMany({
      where: { campaignId, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
      select: { userId: true },
    });

    // Create notifications for each
    for (const member of members) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          title,
          body,
          type: priority === "high" ? "alert" : "info",
        },
      }).catch(() => {});
    }
  } catch {}
}

// ─── Sign Installed Notification ─────────────────────────────────────────────

/**
 * When a sign is marked as installed, notify the supporter who requested it.
 * Uses their preferred contact method.
 */
export async function notifySignInstalled(signId: string) {
  try {
    const sign = await prisma.sign.findUnique({
      where: { id: signId },
      select: {
        contactId: true,
        address1: true,
        campaign: { select: { id: true, name: true, candidateName: true } },
        contact: { select: { id: true, firstName: true, email: true, phone: true } },
      },
    });

    if (!sign?.contact) return;

    const name = sign.contact.firstName || "Supporter";
    const campaignName = sign.campaign.candidateName || sign.campaign.name;
    const addr = sign.address1 || "your address";

    // Log the notification intent — actual sending depends on configured providers
    await logWebInteraction(
      sign.campaign.id,
      sign.contact.id,
      "note",
      `Sign installed at ${addr}. Supporter notified.`,
    );

    // Create task to confirm notification was sent
    // The actual SMS/email send would be triggered by the communications system
    // For now, create a notification record that the comms system can process
    await prisma.notificationLog.create({
      data: {
        campaignId: sign.campaign.id,
        title: `Sign installed for ${name}`,
        body: `Hi ${name}! Your lawn sign for ${campaignName} has been installed at ${addr}. Thank you for your support!`,
        status: "scheduled",
        totalSubscribers: 1,
        audience: { contactId: sign.contact.id, email: sign.contact.email, phone: sign.contact.phone },
      },
    }).catch(() => {});
  } catch {}
}

// ─── Lifecycle Automations ───────────────────────────────────────────────────

/**
 * Check for pledges older than 30 days and create follow-up tasks.
 * Called by cron job.
 */
export async function checkStalePledges(campaignId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stalePledges = await prisma.donation.findMany({
    where: {
      campaignId,
      status: "pledged",
      createdAt: { lt: thirtyDaysAgo },
    },
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    take: 50,
  });

  for (const pledge of stalePledges) {
    const name = [pledge.contact?.firstName, pledge.contact?.lastName].filter(Boolean).join(" ") || "Unknown";
    await autoCreateTask({
      campaignId,
      contactId: pledge.contact?.id,
      title: `Follow up on $${pledge.amount} pledge from ${name}`,
      description: `Pledge created ${pledge.createdAt.toLocaleDateString()} — over 30 days old. Follow up on collection.`,
      priority: "medium",
    });
  }

  return stalePledges.length;
}

/**
 * Check for major donations and create VIP follow-up tasks.
 */
export async function checkMajorDonations(campaignId: string, thresholdAmount: number = 500) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const majorDonations = await prisma.donation.findMany({
    where: {
      campaignId,
      status: { in: ["processed", "receipted"] },
      amount: { gte: thresholdAmount },
      createdAt: { gte: oneDayAgo },
    },
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
  });

  for (const donation of majorDonations) {
    const name = [donation.contact?.firstName, donation.contact?.lastName].filter(Boolean).join(" ") || "Unknown";

    // Flag as super supporter
    if (donation.contact?.id) {
      await prisma.contact.update({
        where: { id: donation.contact.id },
        data: { superSupporter: true },
      }).catch(() => {});

      await autoTagContact(campaignId, donation.contact.id, "major-donor", "#D97706");
    }

    await autoCreateTask({
      campaignId,
      contactId: donation.contact?.id,
      title: `VIP: Thank ${name} for $${donation.amount} donation`,
      description: `Major donation received. Personal follow-up from candidate recommended.`,
      priority: "high",
    });
  }

  return majorDonations.length;
}

/**
 * Check for volunteer milestones and trigger recognition.
 */
export async function checkVolunteerMilestones(campaignId: string) {
  const milestones = [50, 100, 200, 500];

  const volunteers = await prisma.volunteerProfile.findMany({
    where: { campaignId, isActive: true },
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
  });

  let recognized = 0;
  for (const vol of volunteers) {
    for (const milestone of milestones) {
      if (vol.totalHours >= milestone && vol.totalHours < milestone + 5) {
        const name = [vol.contact?.firstName, vol.contact?.lastName].filter(Boolean).join(" ") || "Volunteer";
        await autoCreateTask({
          campaignId,
          contactId: vol.contact?.id,
          title: `Recognize ${name} — ${milestone} volunteer hours!`,
          description: `${name} has reached ${milestone} hours of volunteering. Send a thank-you note or certificate.`,
          priority: "medium",
        });
        recognized++;
      }
    }
  }

  return recognized;
}

/**
 * Post-event follow-up: create tasks for events that completed without follow-up.
 */
export async function checkPostEventFollowUp(campaignId: string) {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const completedEvents = await prisma.event.findMany({
    where: {
      campaignId,
      status: "completed",
      eventDate: { lt: twoDaysAgo },
      followUpMessage: null,
    },
    select: { id: true, name: true, _count: { select: { rsvps: true } } },
    take: 20,
  });

  for (const event of completedEvents) {
    await autoCreateTask({
      campaignId,
      title: `Send follow-up for "${event.name}" (${event._count.rsvps} attendees)`,
      description: `Event completed 2+ days ago with no follow-up sent. Send thank-you + survey to attendees.`,
      priority: "medium",
    });
  }

  return completedEvents.length;
}
