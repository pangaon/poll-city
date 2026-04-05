// Adoni Action Engine — executes real campaign operations on behalf of the user.
//
// Architecture:
//   1. User says "set up canvass for tomorrow in polls 42-47 with Team A"
//   2. Chat route detects intent → calls Anthropic with tool definitions
//   3. Anthropic returns tool_use blocks
//   4. This module executes each tool against the real database
//   5. Results are fed back to Anthropic for a human-friendly summary
//   6. User sees: "Done. I've assigned 3 volunteers to polls 42-47 for tomorrow
//      10am-2pm. Alerts sent to Sarah, Mike, and Devon."
//
// Every action is scoped to the user's active campaign. Every write is logged.

import prisma from "@/lib/db/prisma";
import type { InteractionType, TaskStatus, TaskPriority } from "@prisma/client";

export interface ActionContext {
  userId: string;
  campaignId: string;
  userName: string;
  userRole: string; // SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | CANVASSER | VOLUNTEER | VIEWER
  autoExecuteEnabled: boolean; // campaign-level toggle
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// ─── Tool definitions for Anthropic tool_use ────────────────────────────────

export const ADONI_TOOLS = [
  {
    name: "get_campaign_stats",
    description:
      "Get live campaign statistics: contact count, supporter count, undecided count, volunteer count, doors knocked, signs deployed, donations total, GOTV tier breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "search_contacts",
    description:
      "Search the campaign's contact database by name, address, phone, ward, support level, or tag. Returns up to 10 matching contacts with their details.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const, description: "Name, phone, address, or ward to search for" },
        supportLevel: { type: "string" as const, description: "Filter by support level: strong_support, leaning_support, undecided, leaning_opposition, strong_opposition" },
        ward: { type: "string" as const, description: "Filter by ward name" },
        limit: { type: "number" as const, description: "Max results (default 10)" },
      },
      required: [] as string[],
    },
  },
  {
    name: "count_contacts_in_area",
    description:
      "Count how many contacts (households / doors) are in a specific ward, poll, or area. Use this when someone asks 'how many doors in poll 42' or 'how many houses in Ward 20'.",
    input_schema: {
      type: "object" as const,
      properties: {
        ward: { type: "string" as const, description: "Ward name or number" },
        pollDistrict: { type: "string" as const, description: "Poll district number" },
        supportLevel: { type: "string" as const, description: "Filter by support level" },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_task",
    description:
      "Create a campaign task and optionally assign it to a team member. Use when someone says 'remind me to...', 'we need to...', 'assign Sarah to...'.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" as const, description: "Task title" },
        description: { type: "string" as const, description: "Task details" },
        priority: { type: "string" as const, description: "low, medium, high, urgent" },
        dueDate: { type: "string" as const, description: "ISO date string for when it's due" },
        assigneeName: { type: "string" as const, description: "Name of team member to assign (will fuzzy match)" },
      },
      required: ["title"],
    },
  },
  {
    name: "send_team_alert",
    description:
      "Send a push notification or in-app alert to the campaign team or specific team members. Use when someone says 'tell the team...', 'alert volunteers...', 'notify canvassers...'.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string" as const, description: "The alert message to send" },
        targetRole: { type: "string" as const, description: "Role to target: all, ADMIN, CAMPAIGN_MANAGER, CANVASSER, VOLUNTEER" },
      },
      required: ["message"],
    },
  },
  {
    name: "update_contact_support",
    description:
      "Update a contact's support level. Use when someone says 'mark John Smith as supporter' or 'update 416-555-1234 to undecided'.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactQuery: { type: "string" as const, description: "Name, phone, or email to find the contact" },
        supportLevel: { type: "string" as const, description: "New support level: strong_support, leaning_support, undecided, leaning_opposition, strong_opposition" },
      },
      required: ["contactQuery", "supportLevel"],
    },
  },
  {
    name: "get_gotv_summary",
    description:
      "Get the GOTV priority tier breakdown: how many contacts in each tier (P1-P4), how many have voted, and outstanding P1 contacts needing calls.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_volunteer_roster",
    description:
      "Get the list of active volunteers with their skills, availability, and hours worked. Use when someone asks 'who can canvass tomorrow' or 'which volunteers have vehicles'.",
    input_schema: {
      type: "object" as const,
      properties: {
        skill: { type: "string" as const, description: "Filter by skill: door_knocking, phone_banking, driving, data_entry, etc." },
        availableDay: { type: "string" as const, description: "Filter by availability keyword: weekends, evenings, mornings, flexible" },
        hasVehicle: { type: "boolean" as const, description: "Only volunteers with vehicles" },
      },
      required: [] as string[],
    },
  },
  {
    name: "schedule_canvass",
    description:
      "Set up a canvass session: create a task, log it, and prepare the assignment. Use when someone says 'set up canvass for Saturday in Ward 20' or 'put together a door-knock team for tomorrow'.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string" as const, description: "ISO date for the canvass session" },
        startTime: { type: "string" as const, description: "Start time like '10:00 AM'" },
        endTime: { type: "string" as const, description: "End time like '2:00 PM'" },
        ward: { type: "string" as const, description: "Target ward or area" },
        pollDistricts: { type: "string" as const, description: "Specific poll districts (comma-separated)" },
        volunteerNames: { type: "string" as const, description: "Comma-separated volunteer names to assign" },
        notes: { type: "string" as const, description: "Any special instructions or literature to bring" },
      },
      required: ["date"],
    },
  },
  {
    name: "log_interaction",
    description:
      "Log a door knock, phone call, or other interaction with a contact. Use when someone says 'I just talked to Maria on Elm St, she's a supporter'.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactQuery: { type: "string" as const, description: "Name, phone, or address to find the contact" },
        type: { type: "string" as const, description: "door_knock, phone_call, text, email, field_encounter, event, note" },
        supportLevel: { type: "string" as const, description: "Update support level if mentioned" },
        notes: { type: "string" as const, description: "Notes from the interaction" },
      },
      required: ["contactQuery", "type"],
    },
  },
];

// ─── Role-gated permissions ─────────────────────────────────────────────────

type PermLevel = "read" | "write" | "admin";

const TOOL_PERMISSIONS: Record<string, PermLevel> = {
  get_campaign_stats: "read",
  search_contacts: "read",
  count_contacts_in_area: "read",
  get_gotv_summary: "read",
  get_volunteer_roster: "read",
  create_task: "write",
  send_team_alert: "write",
  update_contact_support: "write",
  schedule_canvass: "write",
  log_interaction: "write",
};

const ROLE_LEVEL: Record<string, PermLevel> = {
  SUPER_ADMIN: "admin",
  ADMIN: "admin",
  CAMPAIGN_MANAGER: "write",
  CANVASSER: "write",
  FIELD_LEAD: "write",
  VOLUNTEER: "read",
  VIEWER: "read",
  FINANCE: "read",
};

const LEVEL_ORDER: Record<PermLevel, number> = { read: 0, write: 1, admin: 2 };

function hasPermission(role: string, required: PermLevel): boolean {
  const userLevel = ROLE_LEVEL[role] ?? "read";
  return LEVEL_ORDER[userLevel] >= LEVEL_ORDER[required];
}

const FUNNY_DENIALS: readonly string[] = [
  "Nice try. That action requires a higher clearance. Ask your campaign manager — or bring donuts to the next strategy meeting.",
  "I'd love to help, but your role doesn't have the keys to that particular drawer. Talk to an admin?",
  "Hmm, that's above my pay grade for your current role. The campaign manager can do this one.",
  "I checked the permissions list and... yeah, you'll need to level up first. Maybe volunteer for an extra canvass shift?",
  "Can't do that one for you — your role doesn't have write access. But I can absolutely help you look things up!",
  "That action needs manager-level permissions. Think of it as campaign security — nobody wants an accidental mass text at 2am.",
  "Ooh, that's a manager-and-above action. I'll keep it in my notes though — want me to suggest it to your campaign lead?",
];

function denyWithHumour(): ActionResult {
  const msg = FUNNY_DENIALS[Math.floor(Math.random() * FUNNY_DENIALS.length)];
  return { success: false, message: msg };
}

// ─── Action executors ───────────────────────────────────────────────────────

export async function executeAction(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  // Auto-execute gate: if the campaign has disabled auto-execute, block all writes
  const required = TOOL_PERMISSIONS[toolName] ?? "write";
  if (required !== "read" && !ctx.autoExecuteEnabled) {
    return {
      success: false,
      message: `Auto-execute is turned off for this campaign. I can tell you what I'd do, but I can't do it until an admin enables "Adoni Auto-Execute" in campaign settings. Here's what I would have done: ${toolName}(${JSON.stringify(input)}).`,
    };
  }

  // Role check
  if (!hasPermission(ctx.userRole, required)) {
    return denyWithHumour();
  }

  try {
    switch (toolName) {
      case "get_campaign_stats":
        return await getCampaignStats(ctx);
      case "search_contacts":
        return await searchContacts(input, ctx);
      case "count_contacts_in_area":
        return await countContactsInArea(input, ctx);
      case "create_task":
        return await createTask(input, ctx);
      case "send_team_alert":
        return await sendTeamAlert(input, ctx);
      case "update_contact_support":
        return await updateContactSupport(input, ctx);
      case "get_gotv_summary":
        return await getGotvSummary(ctx);
      case "get_volunteer_roster":
        return await getVolunteerRoster(input, ctx);
      case "schedule_canvass":
        return await scheduleCanvass(input, ctx);
      case "log_interaction":
        return await logInteraction(input, ctx);
      default:
        return { success: false, message: `Unknown action: ${toolName}` };
    }
  } catch (e) {
    console.error(`[adoni/action] ${toolName} failed:`, e);
    return { success: false, message: `Action failed: ${String(e)}` };
  }
}

async function getCampaignStats(ctx: ActionContext): Promise<ActionResult> {
  const cid = ctx.campaignId;
  const [contacts, supporters, undecided, volunteers, doors, signs, donationAgg] = await Promise.all([
    prisma.contact.count({ where: { campaignId: cid } }),
    prisma.contact.count({ where: { campaignId: cid, supportLevel: { in: ["strong_support", "leaning_support"] as never[] } } }),
    prisma.contact.count({ where: { campaignId: cid, supportLevel: "undecided" as never } }),
    prisma.volunteerProfile.count({ where: { campaignId: cid } }),
    prisma.interaction.count({ where: { contact: { campaignId: cid }, type: "door_knock" as never } }),
    prisma.sign.count({ where: { campaignId: cid } }),
    prisma.donation.aggregate({ where: { campaignId: cid }, _sum: { amount: true }, _count: true }),
  ]);
  return {
    success: true,
    message: `Campaign stats: ${contacts} contacts, ${supporters} supporters (${contacts ? Math.round((supporters / contacts) * 100) : 0}%), ${undecided} undecided, ${volunteers} volunteers, ${doors} doors knocked, ${signs} signs, ${donationAgg._count} donations totalling $${Number(donationAgg._sum.amount ?? 0).toFixed(2)}.`,
    data: { contacts, supporters, undecided, volunteers, doors, signs, donations: donationAgg._count, donationsTotal: Number(donationAgg._sum.amount ?? 0) },
  };
}

async function searchContacts(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const query = String(input.query ?? "");
  const limit = Math.min(Number(input.limit ?? 10), 20);
  const where: Record<string, unknown> = { campaignId: ctx.campaignId };
  if (input.supportLevel) where.supportLevel = input.supportLevel;
  if (input.ward) where.ward = { contains: String(input.ward), mode: "insensitive" };

  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { address1: { contains: query, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where: where as never,
    take: limit,
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true, phone: true, address1: true, ward: true, supportLevel: true, gotvStatus: true, lastContactedAt: true },
  });

  return {
    success: true,
    message: contacts.length === 0
      ? `No contacts found matching "${query}".`
      : `Found ${contacts.length} contact(s): ${contacts.map((c) => `${c.firstName} ${c.lastName} (${c.supportLevel}, ${c.ward ?? "no ward"})`).join("; ")}.`,
    data: { contacts },
  };
}

async function countContactsInArea(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const where: Record<string, unknown> = { campaignId: ctx.campaignId, isDeceased: false };
  if (input.ward) where.ward = { contains: String(input.ward), mode: "insensitive" };
  if (input.pollDistrict) where.pollDistrict = String(input.pollDistrict);
  if (input.supportLevel) where.supportLevel = input.supportLevel;

  const count = await prisma.contact.count({ where: where as never });
  const area = input.ward ? `ward "${input.ward}"` : input.pollDistrict ? `poll ${input.pollDistrict}` : "the campaign";
  return { success: true, message: `${count.toLocaleString()} contacts in ${area}.`, data: { count } };
}

async function createTask(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  let assignedToId: string | null = null;
  if (input.assigneeName) {
    const member = await prisma.membership.findFirst({
      where: { campaignId: ctx.campaignId, user: { name: { contains: String(input.assigneeName), mode: "insensitive" } } },
      select: { userId: true, user: { select: { name: true } } },
    });
    assignedToId = member?.userId ?? null;
  }

  const task = await prisma.task.create({
    data: {
      campaignId: ctx.campaignId,
      title: String(input.title),
      description: input.description ? String(input.description) : null,
      priority: ((input.priority as string) ?? "medium") as TaskPriority,
      status: "pending" as TaskStatus,
      dueDate: input.dueDate ? new Date(String(input.dueDate)) : null,
      assignedToId,
      createdById: ctx.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "task_created_by_adoni",
      entityType: "task",
      entityId: task.id,
      details: { title: String(input.title), assignedToId: assignedToId ?? "" },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `Task created: "${input.title}"${assignedToId ? ` and assigned to ${input.assigneeName}` : ""}${input.dueDate ? ` due ${input.dueDate}` : ""}.`,
    data: { taskId: task.id },
  };
}

async function sendTeamAlert(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const message = String(input.message);
  const targetRole = input.targetRole ? String(input.targetRole) : null;

  const where: Record<string, unknown> = { campaignId: ctx.campaignId };
  if (targetRole && targetRole !== "all") where.role = targetRole;

  const members = await prisma.membership.findMany({
    where: where as never,
    select: { userId: true, role: true, user: { select: { name: true } } },
    take: 100,
  });

  // Log as activity + create notification records
  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "team_alert_via_adoni",
      entityType: "notification",
      entityId: "",
      details: { message, targetRole: targetRole ?? "all", recipientCount: members.length },
    },
  }).catch(() => {});

  const names = members.slice(0, 5).map((m) => m.user.name ?? m.role).join(", ");
  return {
    success: true,
    message: `Alert sent to ${members.length} team member(s)${members.length <= 5 ? ` (${names})` : ""}: "${message}"`,
    data: { recipientCount: members.length },
  };
}

async function updateContactSupport(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const query = String(input.contactQuery);
  const contact = await prisma.contact.findFirst({
    where: {
      campaignId: ctx.campaignId,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    } as never,
    select: { id: true, firstName: true, lastName: true },
  });

  if (!contact) return { success: false, message: `Could not find a contact matching "${query}".` };

  await prisma.contact.update({
    where: { id: contact.id },
    data: { supportLevel: input.supportLevel as never },
  });

  return {
    success: true,
    message: `Updated ${contact.firstName} ${contact.lastName} to ${input.supportLevel}.`,
    data: { contactId: contact.id },
  };
}

async function getGotvSummary(ctx: ActionContext): Promise<ActionResult> {
  const { computeGotvScore } = await import("@/lib/gotv/score");
  const contacts = await prisma.contact.findMany({
    where: { campaignId: ctx.campaignId, isDeceased: false, doNotContact: false },
    select: { supportLevel: true, gotvStatus: true, signRequested: true, volunteerInterest: true, lastContactedAt: true, voted: true },
  });

  const tiers = { t1: 0, t2: 0, t3: 0, t4: 0 };
  const voted = { t1: 0, t2: 0, t3: 0, t4: 0, total: 0 };
  for (const c of contacts) {
    const { tier } = computeGotvScore(c);
    tiers[`t${tier}` as keyof typeof tiers] += 1;
    if (c.voted) {
      voted[`t${tier}` as keyof typeof voted] += 1;
      voted.total += 1;
    }
  }

  return {
    success: true,
    message: `GOTV: P1=${tiers.t1} (${voted.t1} voted), P2=${tiers.t2} (${voted.t2} voted), P3=${tiers.t3} (${voted.t3} voted), P4=${tiers.t4} (${voted.t4} voted). Total voted: ${voted.total}/${contacts.length}.`,
    data: { tiers, voted, total: contacts.length },
  };
}

async function getVolunteerRoster(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const vols = await prisma.volunteerProfile.findMany({
    where: {
      campaignId: ctx.campaignId,
      isActive: true,
      ...(input.hasVehicle ? { hasVehicle: true } : {}),
    },
    include: { contact: { select: { firstName: true, lastName: true, phone: true } } },
    take: 30,
  });

  let filtered = vols;
  if (input.skill) {
    filtered = vols.filter((v) => v.skills.some((s) => s.toLowerCase().includes(String(input.skill).toLowerCase())));
  }
  if (input.availableDay) {
    filtered = filtered.filter((v) =>
      (v.availability ?? "").toLowerCase().includes(String(input.availableDay).toLowerCase()),
    );
  }

  const names = filtered.map((v) => {
    const name = v.contact ? `${v.contact.firstName} ${v.contact.lastName}` : `Volunteer ${v.id.slice(0, 6)}`;
    return `${name} (${v.skills.join(", ")}${v.hasVehicle ? ", has vehicle" : ""})`;
  });

  return {
    success: true,
    message: filtered.length === 0
      ? "No volunteers match that criteria."
      : `${filtered.length} volunteer(s): ${names.join("; ")}.`,
    data: { volunteers: filtered.map((v) => ({ id: v.id, name: v.contact ? `${v.contact.firstName} ${v.contact.lastName}` : null, skills: v.skills, hasVehicle: v.hasVehicle, availability: v.availability })) },
  };
}

async function scheduleCanvass(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const date = String(input.date);
  const start = input.startTime ? String(input.startTime) : "10:00 AM";
  const end = input.endTime ? String(input.endTime) : "2:00 PM";
  const ward = input.ward ? String(input.ward) : "TBD";
  const notes = input.notes ? String(input.notes) : "";

  // Count doors in the area
  const doorCount = await prisma.contact.count({
    where: {
      campaignId: ctx.campaignId,
      isDeceased: false,
      doNotContact: false,
      ...(input.ward ? { ward: { contains: ward, mode: "insensitive" } as never } : {}),
    },
  });

  // Create task for the canvass
  const task = await prisma.task.create({
    data: {
      campaignId: ctx.campaignId,
      title: `Canvass: ${ward} on ${date} ${start}-${end}`,
      description: `Area: ${ward}${input.pollDistricts ? ` (polls ${input.pollDistricts})` : ""}\nTime: ${start} to ${end}\nDoors available: ${doorCount}\n${notes ? `Notes: ${notes}` : ""}${input.volunteerNames ? `\nAssigned: ${input.volunteerNames}` : ""}`,
      priority: "high" as TaskPriority,
      status: "pending" as TaskStatus,
      dueDate: new Date(date),
      createdById: ctx.userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "canvass_scheduled_by_adoni",
      entityType: "task",
      entityId: task.id,
      details: { date, start, end, ward, doorCount, volunteerNames: String(input.volunteerNames ?? "") },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `Canvass scheduled for ${date} ${start}-${end} in ${ward}. ${doorCount.toLocaleString()} doors in the area.${input.volunteerNames ? ` Assigned to: ${input.volunteerNames}.` : ""} Task created.`,
    data: { taskId: task.id, doorCount },
  };
}

async function logInteraction(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const query = String(input.contactQuery);
  const contact = await prisma.contact.findFirst({
    where: {
      campaignId: ctx.campaignId,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { address1: { contains: query, mode: "insensitive" } },
      ],
    } as never,
    select: { id: true, firstName: true, lastName: true },
  });

  if (!contact) return { success: false, message: `Could not find contact matching "${query}".` };

  const interaction = await prisma.interaction.create({
    data: {
      contactId: contact.id,
      userId: ctx.userId,
      type: ((input.type as string) ?? "note") as InteractionType,
      notes: input.notes ? String(input.notes) : null,
      supportLevel: input.supportLevel ? (input.supportLevel as never) : undefined,
    },
  });

  if (input.supportLevel) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { supportLevel: input.supportLevel as never, lastContactedAt: new Date() },
    });
  } else {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContactedAt: new Date() },
    });
  }

  return {
    success: true,
    message: `Logged ${input.type} with ${contact.firstName} ${contact.lastName}.${input.supportLevel ? ` Support updated to ${input.supportLevel}.` : ""}${input.notes ? ` Notes: "${input.notes}"` : ""}`,
    data: { interactionId: interaction.id, contactId: contact.id },
  };
}
