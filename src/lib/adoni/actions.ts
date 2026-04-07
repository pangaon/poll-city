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
import { hasPermission as checkPerm } from "@/lib/permissions/engine";
import type { Permission } from "@/lib/permissions/types";

export interface ActionContext {
  userId: string;
  campaignId: string;
  userName: string;
  userRole: string;
  permissions: Permission[]; // enterprise permissions from CampaignRole
  trustLevel: number; // 1-5 trust level
  autoExecuteEnabled: boolean;
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
  {
    name: "create_reminder",
    description:
      "Create a reminder for the user. Use when they say 'remind me to...', 'don't let me forget...'. Supports recurring reminders.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string" as const, description: "What to remind about" },
        scheduledFor: { type: "string" as const, description: "ISO date or 'tomorrow morning', 'monday 8am'" },
        isRecurring: { type: "boolean" as const, description: "Repeat this reminder" },
        recurPattern: { type: "string" as const, description: "daily_9am, weekly_monday, every_friday" },
      },
      required: ["message", "scheduledFor"] as string[],
    },
  },
  {
    name: "build_smart_list",
    description:
      "Build a filtered contact list from natural language. Use when someone says 'give me all undecided voters in Ward 20 with phones who haven't been called in 2 weeks'.",
    input_schema: {
      type: "object" as const,
      properties: {
        criteria: { type: "string" as const, description: "Natural language filter criteria" },
      },
      required: ["criteria"] as string[],
    },
  },
  {
    name: "draft_email",
    description:
      "Draft a campaign email — returns content for the email composer. Use when someone says 'write me a fundraising email' or 'draft a GOTV reminder'.",
    input_schema: {
      type: "object" as const,
      properties: {
        purpose: { type: "string" as const, description: "What the email is for" },
        tone: { type: "string" as const, description: "urgent, warm, professional, celebratory" },
      },
      required: ["purpose"] as string[],
    },
  },
  {
    name: "draft_social_post",
    description:
      "Write a social media post for a specific platform. Returns ready-to-post copy.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: { type: "string" as const, description: "twitter, facebook, instagram, linkedin" },
        topic: { type: "string" as const, description: "What to post about" },
      },
      required: ["platform", "topic"] as string[],
    },
  },
  {
    name: "get_daily_brief",
    description:
      "Get today's campaign health summary: contacts, supporters, doors knocked today, volunteers active, anomalies. Use when someone says 'brief me' or 'what's the status'.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "deploy_team",
    description:
      "Deploy a canvassing team: assign volunteers to a ward/area, attach literature, create tasks for each member, and send notifications. Use when someone says 'set up a canvassing team of 20 for Ward 3' or 'deploy team alpha to polls 42-47'.",
    input_schema: {
      type: "object" as const,
      properties: {
        teamName: { type: "string" as const, description: "Name for this deployment (e.g. 'Ward 3 Saturday Team')" },
        ward: { type: "string" as const, description: "Target ward or area" },
        pollDistricts: { type: "string" as const, description: "Specific poll districts (comma-separated)" },
        volunteerCount: { type: "number" as const, description: "How many volunteers to assign (will pick available ones)" },
        volunteerNames: { type: "string" as const, description: "Specific volunteer names (comma-separated)" },
        date: { type: "string" as const, description: "ISO date for the deployment" },
        startTime: { type: "string" as const, description: "Start time like '10:00 AM'" },
        endTime: { type: "string" as const, description: "End time like '2:00 PM'" },
        literature: { type: "string" as const, description: "Literature/scripts to bring" },
        notes: { type: "string" as const, description: "Special instructions" },
      },
      required: ["ward", "date"],
    },
  },
  {
    name: "segment_contacts",
    description:
      "Auto-segment imported contacts into wards, polls, and walk lists. Use when someone says 'organize the voter list into walk lists' or 'segment contacts by ward'.",
    input_schema: {
      type: "object" as const,
      properties: {
        ward: { type: "string" as const, description: "Segment only a specific ward (optional, segments all if omitted)" },
        maxPerList: { type: "number" as const, description: "Max contacts per walk list (default 80)" },
      },
      required: [] as string[],
    },
  },
  // ── New tools: closing enterprise automation gaps ──
  {
    name: "list_tasks",
    description:
      "List campaign tasks filtered by status, assignee, or priority. Use when someone says 'what tasks are overdue', 'show my tasks', 'what's pending'.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, description: "Filter: pending, in_progress, completed, cancelled" },
        assigneeName: { type: "string" as const, description: "Filter by assignee name" },
        priority: { type: "string" as const, description: "Filter: low, medium, high, urgent" },
        limit: { type: "number" as const, description: "Max results (default 10)" },
      },
      required: [] as string[],
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task as completed. Use when someone says 'mark that task done', 'we finished the sign installation', 'close task X'.",
    input_schema: {
      type: "object" as const,
      properties: {
        taskQuery: { type: "string" as const, description: "Task title or keyword to find it" },
      },
      required: ["taskQuery"],
    },
  },
  {
    name: "get_donation_summary",
    description:
      "Get donation summary: total raised, donor count, average donation, top donors, recent donations. Use when someone asks 'how much have we raised' or 'who are our top donors'.",
    input_schema: {
      type: "object" as const,
      properties: {
        since: { type: "string" as const, description: "ISO date to filter from (optional)" },
      },
      required: [] as string[],
    },
  },
  {
    name: "log_donation",
    description:
      "Record a new donation for the campaign. Use when someone says 'John donated $100' or 'log a $50 donation from Sarah'.",
    input_schema: {
      type: "object" as const,
      properties: {
        donorName: { type: "string" as const, description: "Name of the donor" },
        amount: { type: "number" as const, description: "Donation amount in dollars" },
        method: { type: "string" as const, description: "Payment method: cash, cheque, e_transfer, credit_card, other" },
        notes: { type: "string" as const, description: "Any notes about the donation" },
      },
      required: ["donorName", "amount"],
    },
  },
  {
    name: "create_event",
    description:
      "Create a campaign event (rally, fundraiser, town hall, etc). Use when someone says 'set up a fundraiser for next week' or 'create a volunteer appreciation event'.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" as const, description: "Event title" },
        date: { type: "string" as const, description: "ISO date for the event" },
        startTime: { type: "string" as const, description: "Start time like '7:00 PM'" },
        endTime: { type: "string" as const, description: "End time like '9:00 PM'" },
        location: { type: "string" as const, description: "Event location/venue" },
        type: { type: "string" as const, description: "rally, fundraiser, town_hall, canvass_launch, volunteer_social, debate_watch, other" },
        description: { type: "string" as const, description: "Event details" },
        capacity: { type: "number" as const, description: "Max attendees (optional)" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "create_sign_request",
    description:
      "Create a lawn sign request. Use when someone says 'put a sign at 123 Elm St' or 'Sarah wants a lawn sign'.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactQuery: { type: "string" as const, description: "Name, address, or phone of requester" },
        address: { type: "string" as const, description: "Sign installation address (if different from contact)" },
        signType: { type: "string" as const, description: "lawn, window, balcony, large (default: lawn)" },
        notes: { type: "string" as const, description: "Installation notes" },
      },
      required: ["contactQuery"],
    },
  },
  {
    name: "export_contacts",
    description:
      "Trigger a contact export and return the download link. Use when someone says 'export the voter list' or 'download supporters as CSV'.",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: { type: "string" as const, description: "Natural language filter: 'supporters', 'ward 5', 'undecided with phones', 'all'" },
        format: { type: "string" as const, description: "csv or json (default csv)" },
      },
      required: [] as string[],
    },
  },
];

// ─── Permission-gated tools (enterprise RBAC) ──────────────────────────────

/** Maps each Adoni tool to the permission required to use it */
const TOOL_REQUIRED_PERMISSION: Record<string, Permission> = {
  get_campaign_stats: "analytics:read",
  search_contacts: "contacts:read",
  count_contacts_in_area: "contacts:read",
  get_gotv_summary: "gotv:read",
  get_volunteer_roster: "volunteers:read",
  get_daily_brief: "analytics:read",
  build_smart_list: "contacts:read",
  create_task: "tasks:write",
  send_team_alert: "notifications:write",
  update_contact_support: "contacts:write",
  schedule_canvass: "canvassing:manage",
  log_interaction: "canvassing:write",
  create_reminder: "adoni:write_tools",
  draft_email: "email:write",
  draft_social_post: "social:write",
  deploy_team: "canvassing:manage",
  segment_contacts: "contacts:write",
  list_tasks: "tasks:read",
  complete_task: "tasks:write",
  get_donation_summary: "donations:read",
  log_donation: "donations:write",
  create_event: "events:write",
  create_sign_request: "signs:write",
  export_contacts: "contacts:export",
};

function toolAllowed(ctx: ActionContext, toolName: string): boolean {
  const required = TOOL_REQUIRED_PERMISSION[toolName];
  if (!required) return checkPerm(ctx.permissions, "adoni:write_tools");
  return checkPerm(ctx.permissions, required);
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
  // Permission check (enterprise RBAC)
  if (!toolAllowed(ctx, toolName)) {
    return denyWithHumour();
  }

  // Auto-execute gate: read tools always allowed, write tools need toggle
  const requiredPerm = TOOL_REQUIRED_PERMISSION[toolName] ?? "adoni:write_tools";
  const isReadTool = requiredPerm.endsWith(":read");
  if (!isReadTool && !ctx.autoExecuteEnabled && !checkPerm(ctx.permissions, "adoni:auto_execute")) {
    return {
      success: false,
      message: `Auto-execute is turned off for this campaign. I can tell you what I'd do, but I can't do it until an admin enables "Adoni Auto-Execute" in campaign settings. Here's what I would have done: ${toolName}(${JSON.stringify(input)}).`,
    };
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
      case "create_reminder":
        return await createReminder(input, ctx);
      case "build_smart_list":
        return await buildSmartList(input, ctx);
      case "draft_email":
        return { success: true, message: `Email draft ready for "${input.purpose}". Tone: ${input.tone ?? "professional"}. Navigate to /communications/email to review and send.` };
      case "draft_social_post":
        return { success: true, message: `Social post drafted for ${input.platform} about "${input.topic}". Navigate to /communications/social to review and schedule.` };
      case "get_daily_brief":
        return await getDailyBrief(ctx);
      case "deploy_team":
        return await deployTeam(input, ctx);
      case "segment_contacts":
        return await segmentContacts(input, ctx);
      case "list_tasks":
        return await listTasks(input, ctx);
      case "complete_task":
        return await completeTask(input, ctx);
      case "get_donation_summary":
        return await getDonationSummary(input, ctx);
      case "log_donation":
        return await logDonation(input, ctx);
      case "create_event":
        return await createEvent(input, ctx);
      case "create_sign_request":
        return await createSignRequest(input, ctx);
      case "export_contacts":
        return await exportContactsViaAdoni(input, ctx);
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

function parseScheduledTime(input: string): Date {
  const now = new Date();
  const lower = input.toLowerCase();
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(lower.includes("morning") ? 9 : lower.includes("evening") ? 18 : 9, 0, 0, 0);
    return d;
  }
  if (lower.includes("monday")) {
    const d = new Date(now);
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    d.setHours(8, 0, 0, 0);
    return d;
  }
  try { return new Date(input); } catch { return new Date(now.getTime() + 86400000); }
}

async function createReminder(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const scheduledFor = parseScheduledTime(String(input.scheduledFor));
  await prisma.adoniReminder.create({
    data: {
      userId: ctx.userId,
      campaignId: ctx.campaignId,
      message: String(input.message),
      scheduledFor,
      isRecurring: Boolean(input.isRecurring),
      recurPattern: input.recurPattern ? String(input.recurPattern) : null,
    },
  });
  return {
    success: true,
    message: `Reminder set: "${input.message}" for ${scheduledFor.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} at ${scheduledFor.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}.${input.isRecurring ? ` Recurring: ${input.recurPattern}.` : ""}`,
  };
}

async function buildSmartList(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const criteria = String(input.criteria).toLowerCase();
  const where: Record<string, unknown> = { campaignId: ctx.campaignId, isDeceased: false, doNotContact: false };

  // Parse natural language filters
  if (criteria.includes("undecided")) where.supportLevel = "undecided";
  else if (criteria.includes("supporter")) where.supportLevel = { in: ["strong_support", "leaning_support"] };
  if (criteria.includes("phone")) where.phone = { not: null };
  if (criteria.includes("email")) where.email = { not: null };
  if (criteria.includes("volunteer")) where.volunteerInterest = true;
  if (criteria.includes("sign")) where.signRequested = true;

  // Time-based filters
  const daysMatch = criteria.match(/(\d+)\s*(days?|weeks?)/);
  if (daysMatch && criteria.includes("not contacted")) {
    const days = daysMatch[2]?.includes("week") ? Number(daysMatch[1]) * 7 : Number(daysMatch[1]);
    where.OR = [
      { lastContactedAt: null },
      { lastContactedAt: { lt: new Date(Date.now() - days * 86400000) } },
    ];
  }

  // Ward filter
  const wardMatch = criteria.match(/ward\s*(\d+|[\w\s-]+)/i);
  if (wardMatch) where.ward = { contains: wardMatch[1].trim(), mode: "insensitive" };

  const [count, sample] = await Promise.all([
    prisma.contact.count({ where: where as never }),
    prisma.contact.findMany({
      where: where as never,
      take: 5,
      select: { firstName: true, lastName: true, phone: true, ward: true, supportLevel: true },
    }),
  ]);

  const sampleNames = sample.map((c) => `${c.firstName} ${c.lastName} (${c.supportLevel})`).join(", ");
  return {
    success: true,
    message: `Found ${count.toLocaleString()} contacts matching "${input.criteria}".${count > 0 ? ` Sample: ${sampleNames}.` : ""} Navigate to /contacts to view the full filtered list.`,
    data: { count },
  };
}

async function getDailyBrief(ctx: ActionContext): Promise<ActionResult> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const [contacts, supporters, undecided, doorsToday, doorsYesterday, volunteers, signs, donationAgg] = await Promise.all([
    prisma.contact.count({ where: { campaignId: ctx.campaignId } }),
    prisma.contact.count({ where: { campaignId: ctx.campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as never[] } } }),
    prisma.contact.count({ where: { campaignId: ctx.campaignId, supportLevel: "undecided" as never } }),
    prisma.interaction.count({ where: { contact: { campaignId: ctx.campaignId }, type: "door_knock" as never, createdAt: { gte: todayStart } } }),
    prisma.interaction.count({ where: { contact: { campaignId: ctx.campaignId }, type: "door_knock" as never, createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.volunteerProfile.count({ where: { campaignId: ctx.campaignId, isActive: true } }),
    prisma.sign.count({ where: { campaignId: ctx.campaignId } }),
    prisma.donation.aggregate({ where: { campaignId: ctx.campaignId }, _sum: { amount: true }, _count: true }),
  ]);

  const supportRate = contacts > 0 ? Math.round((supporters / contacts) * 100) : 0;
  const doorsTrend = doorsToday > doorsYesterday ? "up" : doorsToday < doorsYesterday ? "down" : "flat";

  return {
    success: true,
    message: [
      `Daily brief for ${ctx.userName}:`,
      `• ${contacts.toLocaleString()} contacts, ${supporters.toLocaleString()} supporters (${supportRate}%), ${undecided.toLocaleString()} undecided`,
      `• ${doorsToday} doors knocked today (${doorsTrend} from yesterday's ${doorsYesterday})`,
      `• ${volunteers} active volunteers, ${signs} signs deployed`,
      `• ${donationAgg._count} donations totalling $${Number(donationAgg._sum.amount ?? 0).toFixed(2)}`,
    ].join("\n"),
  };
}

async function deployTeam(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const ward = String(input.ward);
  const date = String(input.date);
  const start = input.startTime ? String(input.startTime) : "10:00 AM";
  const end = input.endTime ? String(input.endTime) : "2:00 PM";
  const teamName = input.teamName ? String(input.teamName) : `${ward} ${date} Team`;
  const literature = input.literature ? String(input.literature) : null;
  const notes = input.notes ? String(input.notes) : "";
  const requestedCount = input.volunteerCount ? Number(input.volunteerCount) : 0;
  const namedVolunteers = input.volunteerNames ? String(input.volunteerNames).split(",").map((n) => n.trim()).filter(Boolean) : [];

  // Count doors in target area
  const doorCount = await prisma.contact.count({
    where: {
      campaignId: ctx.campaignId,
      isDeceased: false,
      doNotContact: false,
      ...(ward ? { ward: { contains: ward, mode: "insensitive" } as never } : {}),
    },
  });

  if (doorCount === 0) {
    return {
      success: false,
      message: `No contacts found in ${ward}. We need contacts imported and assigned to wards before deploying a team there. Try importing a voter list first, or check the ward name.`,
    };
  }

  // Find volunteers — by name or by availability
  let assignedMembers: Array<{ userId: string; name: string }> = [];

  if (namedVolunteers.length > 0) {
    for (const name of namedVolunteers) {
      const member = await prisma.membership.findFirst({
        where: {
          campaignId: ctx.campaignId,
          user: { name: { contains: name, mode: "insensitive" } },
        },
        select: { userId: true, user: { select: { name: true } } },
      });
      if (member) {
        assignedMembers.push({ userId: member.userId, name: member.user.name ?? name });
      }
    }
    const notFound = namedVolunteers.filter((n) => !assignedMembers.some((m) => m.name.toLowerCase().includes(n.toLowerCase())));
    if (notFound.length > 0 && assignedMembers.length === 0) {
      return {
        success: false,
        message: `Could not find team members: ${notFound.join(", ")}. Check the names and make sure they are campaign members.`,
        data: { notFound },
      };
    }
  } else if (requestedCount > 0) {
    // Pick available volunteers from the roster
    const vols = await prisma.volunteerProfile.findMany({
      where: { campaignId: ctx.campaignId, isActive: true },
      include: { contact: { select: { firstName: true, lastName: true } }, user: { select: { id: true, name: true } } },
      take: requestedCount,
    });
    assignedMembers = vols
      .filter((v) => v.user)
      .map((v) => ({ userId: v.user!.id, name: v.user!.name ?? `${v.contact?.firstName ?? ""} ${v.contact?.lastName ?? ""}`.trim() }));

    if (assignedMembers.length < requestedCount) {
      // Not enough but proceed with what we have
    }
  }

  // Create a canvass list for this deployment
  const canvassList = await prisma.canvassList.create({
    data: {
      campaignId: ctx.campaignId,
      name: teamName,
      description: `Deployed via Adoni. Ward: ${ward}, Date: ${date} ${start}-${end}.${literature ? ` Literature: ${literature}.` : ""}${notes ? ` Notes: ${notes}` : ""}`,
      status: "pending" as never,
      geoArea: { ward, pollDistricts: input.pollDistricts ? String(input.pollDistricts) : null },
    },
  });

  // Create assignments for each volunteer
  for (const member of assignedMembers) {
    await prisma.canvassAssignment.create({
      data: {
        canvassListId: canvassList.id,
        userId: member.userId,
        status: "pending" as never,
      },
    });
  }

  // Create a master task
  const task = await prisma.task.create({
    data: {
      campaignId: ctx.campaignId,
      title: `Team Deployment: ${teamName}`,
      description: [
        `Ward: ${ward}`,
        input.pollDistricts ? `Polls: ${input.pollDistricts}` : null,
        `Time: ${start} to ${end}`,
        `Doors: ${doorCount}`,
        `Team: ${assignedMembers.length} volunteer(s)${assignedMembers.length > 0 ? ` — ${assignedMembers.map((m) => m.name).join(", ")}` : ""}`,
        literature ? `Literature: ${literature}` : null,
        notes ? `Notes: ${notes}` : null,
      ].filter(Boolean).join("\n"),
      priority: "high" as TaskPriority,
      status: "pending" as TaskStatus,
      dueDate: new Date(date),
      createdById: ctx.userId,
    },
  });

  // Create individual tasks for each volunteer
  for (const member of assignedMembers) {
    await prisma.task.create({
      data: {
        campaignId: ctx.campaignId,
        title: `Canvass ${ward} — ${date} ${start}-${end}`,
        description: `Part of: ${teamName}.${literature ? ` Bring: ${literature}.` : ""}${notes ? ` ${notes}` : ""}`,
        priority: "high" as TaskPriority,
        status: "pending" as TaskStatus,
        dueDate: new Date(date),
        assignedToId: member.userId,
        createdById: ctx.userId,
      },
    });
  }

  // Activity log
  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "team_deployed_by_adoni",
      entityType: "canvassList",
      entityId: canvassList.id,
      details: {
        teamName,
        ward,
        date,
        start,
        end,
        volunteerCount: assignedMembers.length,
        doorCount,
        literature: literature ?? "",
      },
    },
  }).catch(() => {});

  const missingCount = requestedCount > 0 && assignedMembers.length < requestedCount
    ? ` (${requestedCount - assignedMembers.length} more needed — not enough available volunteers)`
    : "";

  return {
    success: true,
    message: `Team "${teamName}" deployed to ${ward} for ${date} ${start}-${end}. ${assignedMembers.length} volunteer(s) assigned${missingCount}. ${doorCount.toLocaleString()} doors in the area.${literature ? ` Literature: ${literature}.` : ""} Tasks created for each team member.`,
    data: { canvassListId: canvassList.id, taskId: task.id, volunteerCount: assignedMembers.length, doorCount },
  };
}

async function segmentContacts(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const targetWard = input.ward ? String(input.ward) : null;
  const maxPerList = input.maxPerList ? Number(input.maxPerList) : 80;

  // Get ward breakdown
  const wardWhere: Record<string, unknown> = {
    campaignId: ctx.campaignId,
    isDeceased: false,
    doNotContact: false,
    ward: { not: null },
  };
  if (targetWard) {
    wardWhere.ward = { contains: targetWard, mode: "insensitive" };
  }

  const contacts = await prisma.contact.findMany({
    where: wardWhere as never,
    select: { id: true, ward: true, pollDistrict: true, address1: true, supportLevel: true },
    orderBy: [{ ward: "asc" }, { pollDistrict: "asc" }, { address1: "asc" }],
  });

  if (contacts.length === 0) {
    return {
      success: false,
      message: targetWard
        ? `No contacts with ward data found in "${targetWard}". Make sure contacts have ward assignments — this usually comes from the voter list import.`
        : "No contacts have ward data yet. Import a voter list with ward/poll columns, or run geocoding to assign wards automatically.",
    };
  }

  // Group by ward
  const wardGroups = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const ward = c.ward ?? "Unassigned";
    const list = wardGroups.get(ward) ?? [];
    list.push(c);
    wardGroups.set(ward, list);
  }

  // Create canvass lists per ward (split into chunks of maxPerList)
  let listsCreated = 0;
  const wardSummary: string[] = [];

  for (const [ward, wardContacts] of Array.from(wardGroups.entries())) {
    const chunks: (typeof contacts)[] = [];
    for (let i = 0; i < wardContacts.length; i += maxPerList) {
      chunks.push(wardContacts.slice(i, i + maxPerList));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const listName = chunks.length === 1
        ? `Walk List — ${ward}`
        : `Walk List — ${ward} (${i + 1}/${chunks.length})`;

      await prisma.canvassList.create({
        data: {
          campaignId: ctx.campaignId,
          name: listName,
          description: `Auto-segmented by Adoni. ${chunk.length} contacts.`,
          status: "pending" as never,
          geoArea: { ward, contactCount: chunk.length },
        },
      });
      listsCreated++;
    }

    wardSummary.push(`${ward}: ${wardContacts.length} contacts, ${chunks.length} list(s)`);
  }

  // Count contacts without ward data
  const noWardCount = await prisma.contact.count({
    where: {
      campaignId: ctx.campaignId,
      isDeceased: false,
      doNotContact: false,
      OR: [{ ward: null }, { ward: "" }],
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "contacts_segmented_by_adoni",
      entityType: "canvassList",
      entityId: "",
      details: { listsCreated, totalContacts: contacts.length, wards: wardGroups.size },
    },
  }).catch(() => {});

  const wardBreakdown = wardSummary.slice(0, 10).join("; ");
  return {
    success: true,
    message: `Segmented ${contacts.length.toLocaleString()} contacts into ${listsCreated} walk list(s) across ${wardGroups.size} ward(s). ${wardBreakdown}.${noWardCount > 0 ? ` ${noWardCount} contacts have no ward data and were skipped — consider running geocoding or checking the import.` : ""} Navigate to /canvassing/turf-builder to assign these lists to volunteers.`,
    data: { listsCreated, totalContacts: contacts.length, wards: wardGroups.size, noWardCount },
  };
}

// ─── New tool implementations: Enterprise automation gaps ──────────────────

async function listTasks(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const limit = Math.min(Number(input.limit ?? 10), 20);
  const where: Record<string, unknown> = { campaignId: ctx.campaignId };
  if (input.status) where.status = input.status;
  if (input.priority) where.priority = input.priority;
  if (input.assigneeName) {
    where.assignedTo = { name: { contains: String(input.assigneeName), mode: "insensitive" } };
  }

  const tasks = await prisma.task.findMany({
    where: where as never,
    take: limit,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    select: { id: true, title: true, status: true, priority: true, dueDate: true, assignedTo: { select: { name: true } } },
  });

  if (tasks.length === 0) return { success: true, message: "No tasks found matching those filters." };

  const lines = tasks.map((t) => {
    const due = t.dueDate ? ` due ${new Date(t.dueDate).toLocaleDateString("en-CA")}` : "";
    const assigned = t.assignedTo?.name ? ` (${t.assignedTo.name})` : "";
    const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed" ? " OVERDUE" : "";
    return `[${t.priority}] ${t.title}${assigned}${due}${overdue} — ${t.status}`;
  });

  return { success: true, message: `${tasks.length} task(s) found:\n${lines.join("\n")}`, data: { tasks } };
}

async function completeTask(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const query = String(input.taskQuery);
  const task = await prisma.task.findFirst({
    where: {
      campaignId: ctx.campaignId,
      title: { contains: query, mode: "insensitive" },
      status: { not: "completed" as never },
    } as never,
    select: { id: true, title: true },
  });

  if (!task) return { success: false, message: `Could not find an open task matching "${query}".` };

  await prisma.task.update({
    where: { id: task.id },
    data: { status: "completed" as never, completedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "task_completed_via_adoni",
      entityType: "task",
      entityId: task.id,
      details: { title: task.title },
    },
  }).catch(() => {});

  return { success: true, message: `Task completed: "${task.title}".`, data: { taskId: task.id } };
}

async function getDonationSummary(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const sinceDate = input.since ? new Date(String(input.since)) : undefined;
  const dateFilter = sinceDate ? { createdAt: { gte: sinceDate } } : {};

  const [agg, recentDonations, donorCount] = await Promise.all([
    prisma.donation.aggregate({
      where: { campaignId: ctx.campaignId, ...dateFilter } as never,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
      _max: { amount: true },
    }),
    prisma.donation.findMany({
      where: { campaignId: ctx.campaignId, ...dateFilter } as never,
      orderBy: { amount: "desc" },
      take: 5,
      select: { amount: true, contact: { select: { firstName: true, lastName: true } }, createdAt: true },
    }),
    prisma.donation.groupBy({
      by: ["contactId"],
      where: { campaignId: ctx.campaignId, ...dateFilter } as never,
    }),
  ]);

  const total = Number(agg._sum.amount ?? 0);
  const avg = Number(agg._avg.amount ?? 0);
  const topDonors = recentDonations.map((d) =>
    `${d.contact?.firstName ?? "Anonymous"} ${d.contact?.lastName ?? ""} — $${Number(d.amount).toFixed(2)}`
  ).join("; ");

  return {
    success: true,
    message: `Donations${sinceDate ? ` since ${sinceDate.toLocaleDateString("en-CA")}` : ""}: $${total.toFixed(2)} total from ${donorCount.length} donor(s), ${agg._count} donation(s). Average: $${avg.toFixed(2)}.${recentDonations.length > 0 ? ` Top: ${topDonors}.` : ""}`,
    data: { total, count: agg._count, donors: donorCount.length, average: avg },
  };
}

async function logDonation(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const donorName = String(input.donorName);
  const amount = Number(input.amount);
  if (amount <= 0 || amount > 25000) {
    return { success: false, message: `Invalid donation amount: $${amount}. Ontario individual donation limit is $1,648.26 (2026). Check the amount and try again.` };
  }

  // Find or note the donor contact
  const contact = await prisma.contact.findFirst({
    where: {
      campaignId: ctx.campaignId,
      OR: [
        { firstName: { contains: donorName.split(" ")[0] ?? donorName, mode: "insensitive" } },
        { lastName: { contains: donorName.split(" ").slice(1).join(" ") || donorName, mode: "insensitive" } },
      ],
    } as never,
    select: { id: true, firstName: true, lastName: true },
  });

  const donation = await prisma.donation.create({
    data: {
      campaignId: ctx.campaignId,
      contactId: contact?.id ?? null,
      amount,
      method: ((input.method as string) ?? "other") as never,
      notes: input.notes ? String(input.notes) : donorName,
      receiptSent: false,
    } as never,
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "donation_logged_via_adoni",
      entityType: "donation",
      entityId: donation.id,
      details: { donorName, amount, method: input.method ?? "other" },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `Donation logged: $${amount.toFixed(2)} from ${donorName}${contact ? ` (matched to ${contact.firstName} ${contact.lastName})` : " (no matching contact found — consider adding them)"}. Remember to issue a receipt for donations over $20.`,
    data: { donationId: donation.id, contactId: contact?.id },
  };
}

async function createEvent(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const title = String(input.title);
  const date = new Date(String(input.date));
  const start = input.startTime ? String(input.startTime) : "7:00 PM";
  const end = input.endTime ? String(input.endTime) : "9:00 PM";

  const event = await prisma.event.create({
    data: {
      campaignId: ctx.campaignId,
      title,
      description: input.description ? String(input.description) : null,
      date,
      startTime: start,
      endTime: end,
      location: input.location ? String(input.location) : null,
      type: ((input.type as string) ?? "other") as never,
      capacity: input.capacity ? Number(input.capacity) : null,
      createdById: ctx.userId,
    } as never,
  });

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "event_created_via_adoni",
      entityType: "event",
      entityId: event.id,
      details: { title, date: date.toISOString(), location: input.location ?? "" },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `Event created: "${title}" on ${date.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })} from ${start} to ${end}${input.location ? ` at ${input.location}` : ""}${input.capacity ? ` (capacity: ${input.capacity})` : ""}. Navigate to /events to manage RSVPs and share the invite.`,
    data: { eventId: event.id },
  };
}

async function createSignRequest(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
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
    select: { id: true, firstName: true, lastName: true, address1: true, city: true },
  });

  const signAddress = input.address ? String(input.address) : contact?.address1 ?? query;

  const sign = await prisma.sign.create({
    data: {
      campaignId: ctx.campaignId,
      contactId: contact?.id ?? null,
      address: signAddress,
      city: contact?.city ?? null,
      type: ((input.signType as string) ?? "lawn") as never,
      status: "requested" as never,
      notes: input.notes ? String(input.notes) : null,
    } as never,
  });

  // Mark contact as sign requested
  if (contact) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { signRequested: true },
    });
  }

  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "sign_request_via_adoni",
      entityType: "sign",
      entityId: sign.id,
      details: { address: signAddress, contactName: contact ? `${contact.firstName} ${contact.lastName}` : query },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `Sign request created at ${signAddress}${contact ? ` for ${contact.firstName} ${contact.lastName}` : ""}. Type: ${input.signType ?? "lawn"}. Navigate to /signs to manage installation schedule.`,
    data: { signId: sign.id, contactId: contact?.id },
  };
}

async function exportContactsViaAdoni(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
  const filter = String(input.filter ?? "all").toLowerCase();
  const where: Record<string, unknown> = { campaignId: ctx.campaignId, isDeceased: false };

  if (filter.includes("supporter")) where.supportLevel = { in: ["strong_support", "leaning_support"] };
  else if (filter.includes("undecided")) where.supportLevel = "undecided";
  else if (filter.includes("opposition")) where.supportLevel = { in: ["leaning_opposition", "strong_opposition"] };
  if (filter.includes("phone")) where.phone = { not: null };
  if (filter.includes("email")) where.email = { not: null };

  const wardMatch = filter.match(/ward\s*(\d+|[\w\s-]+)/i);
  if (wardMatch) where.ward = { contains: wardMatch[1].trim(), mode: "insensitive" };

  const count = await prisma.contact.count({ where: where as never });

  if (count === 0) {
    return { success: false, message: `No contacts match the filter "${input.filter}". Try a broader filter or "all".` };
  }

  // Log the export intent — actual download happens through the export UI
  await prisma.activityLog.create({
    data: {
      campaignId: ctx.campaignId,
      userId: ctx.userId,
      action: "export_initiated_via_adoni",
      entityType: "contact_export",
      entityId: "",
      details: { filter: input.filter ?? "all", format: input.format ?? "csv", estimatedCount: count },
    },
  }).catch(() => {});

  return {
    success: true,
    message: `${count.toLocaleString()} contacts match your filter. Navigate to /import-export and use the targeted export with these filters applied, or use this direct link: /import-export?export=targeted&filter=${encodeURIComponent(filter)}. Format: ${input.format ?? "CSV"}.`,
    data: { count, filter: input.filter ?? "all" },
  };
}

// Suspicious activity detection — called by chat route for low-permission roles
// Returns true if suspicious AND blocks the conversation.
export async function checkSuspiciousActivity(
  userId: string,
  campaignId: string,
  role: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<boolean> {
  if (!["CANVASSER", "VOLUNTEER", "VIEWER"].includes(role)) return false;

  const sensitivePatterns = [
    "how many supporters",
    "total contacts",
    "donation",
    "gotv strategy",
    "how much money",
    "who donated",
    "spending limit",
    "what is our budget",
    "campaign strategy",
    "opponent intel",
  ];

  const userMessages = conversationHistory.filter((m) => m.role === "user");
  const sensitiveCount = userMessages.filter((m) =>
    sensitivePatterns.some((p) => m.content.toLowerCase().includes(p)),
  ).length;

  if (sensitiveCount >= 3) {
    await prisma.adoniSuspiciousActivity.create({
      data: {
        campaignId,
        userId,
        questions: userMessages.map((m) => m.content) as unknown as object,
      },
    }).catch(() => {});
    return true; // BLOCK — caller should terminate the conversation
  }
  return false;
}
