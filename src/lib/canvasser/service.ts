import { Prisma, Role, SupportLevel, TaskPriority } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { isManagerRole } from "./context";

export function toSupportLevel(outcome: string): SupportLevel | null {
  switch (outcome) {
    case "STRONG_SUPPORT":
      return "strong_support";
    case "LEAN_SUPPORT":
      return "leaning_support";
    case "UNDECIDED":
      return "undecided";
    case "LEAN_OPPOSE":
    case "OPPOSE":
      return "leaning_opposition";
    default:
      return null;
  }
}

async function ensureMissionAccess(params: {
  missionId: string;
  campaignId: string;
  userId: string;
  membershipId: string;
  role: Role;
}) {
  const mission = await prisma.fieldAssignment.findFirst({
    where: {
      id: params.missionId,
      campaignId: params.campaignId,
      deletedAt: null,
    },
  });
  if (!mission) throw new Error("MISSION_NOT_FOUND");

  if (isManagerRole(params.role)) return mission;

  const assignedToUser = mission.assignedUserId === params.userId;
  const assignedToMembership = mission.assignedVolunteerId === params.membershipId;
  if (!assignedToUser && !assignedToMembership) throw new Error("MISSION_FORBIDDEN");

  return mission;
}

async function ensureStopAccess(params: {
  stopId: string;
  campaignId: string;
  userId: string;
  membershipId: string;
  role: Role;
}) {
  const stop = await prisma.assignmentStop.findFirst({
    where: {
      id: params.stopId,
      assignment: {
        campaignId: params.campaignId,
        deletedAt: null,
      },
    },
    include: { assignment: true, contact: true, household: true },
  });
  if (!stop) throw new Error("STOP_NOT_FOUND");

  if (isManagerRole(params.role)) return stop;

  const assignedToUser = stop.assignment.assignedUserId === params.userId;
  const assignedToMembership = stop.assignment.assignedVolunteerId === params.membershipId;
  if (!assignedToUser && !assignedToMembership) throw new Error("MISSION_FORBIDDEN");

  return stop;
}

export const missionService = {
  async listAssignedMissions(userId: string, membershipId: string, campaignId: string, role: Role) {
    const where: Prisma.FieldAssignmentWhereInput = {
      campaignId,
      deletedAt: null,
      ...(isManagerRole(role)
        ? {}
        : {
            OR: [{ assignedUserId: userId }, { assignedVolunteerId: membershipId }],
          }),
    };

    return prisma.fieldAssignment.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        fieldUnit: { select: { id: true, name: true, ward: true, pollNumber: true } },
        assignedUser: { select: { id: true, name: true } },
        assignedGroup: { select: { id: true, name: true } },
        stops: { select: { id: true, status: true } },
      },
    });
  },

  async getMissionDetail(userId: string, membershipId: string, campaignId: string, missionId: string, role: Role) {
    await ensureMissionAccess({ missionId, campaignId, userId, membershipId, role });

    return prisma.fieldAssignment.findFirst({
      where: { id: missionId, campaignId, deletedAt: null },
      include: {
        fieldUnit: true,
        assignedUser: { select: { id: true, name: true } },
        assignedGroup: { select: { id: true, name: true } },
        stops: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                supportLevel: true,
                volunteerInterest: true,
                signRequested: true,
                notes: true,
                interactions: {
                  orderBy: { createdAt: "desc" },
                  take: 5,
                },
              },
            },
            household: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
  },

  async startMission(userId: string, membershipId: string, campaignId: string, missionId: string, role: Role) {
    const mission = await ensureMissionAccess({ missionId, campaignId, userId, membershipId, role });
    const updated = await prisma.fieldAssignment.update({
      where: { id: mission.id },
      data: {
        status: "in_progress",
        startedAt: mission.startedAt ?? new Date(),
      },
    });

    await audit(prisma, "canvasser.mission_started", {
      campaignId,
      userId,
      entityType: "FieldAssignment",
      entityId: missionId,
      after: { status: "in_progress" },
    });

    return updated;
  },

  async completeMission(userId: string, membershipId: string, campaignId: string, missionId: string, role: Role) {
    const mission = await ensureMissionAccess({ missionId, campaignId, userId, membershipId, role });
    const updated = await prisma.fieldAssignment.update({
      where: { id: mission.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    await audit(prisma, "canvasser.mission_completed", {
      campaignId,
      userId,
      entityType: "FieldAssignment",
      entityId: missionId,
      after: { status: "completed" },
    });

    return updated;
  },
};

export const doorService = {
  async getCurrentStop(userId: string, membershipId: string, campaignId: string, missionId: string, role: Role) {
    await ensureMissionAccess({ missionId, campaignId, userId, membershipId, role });
    return prisma.assignmentStop.findFirst({
      where: {
        assignmentId: missionId,
        status: { in: ["pending", "in_progress"] },
      },
      orderBy: { order: "asc" },
      include: {
        contact: true,
        household: {
          include: {
            contacts: {
              orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
              include: {
                interactions: {
                  orderBy: { createdAt: "desc" },
                  take: 3,
                },
              },
            },
          },
        },
        sign: true,
      },
    });
  },

  async completeDoor(params: {
    userId: string;
    membershipId: string;
    role: Role;
    campaignId: string;
    stopId: string;
    outcome: string;
    notes?: string;
    missionId?: string;
  }) {
    const stop = await ensureStopAccess({
      stopId: params.stopId,
      campaignId: params.campaignId,
      userId: params.userId,
      membershipId: params.membershipId,
      role: params.role,
    });

    const updated = await prisma.assignmentStop.update({
      where: { id: params.stopId },
      data: {
        status: "completed",
        completedById: params.userId,
        completedAt: new Date(),
        notes: params.notes,
        outcome: {
          ...(stop.outcome as Record<string, unknown> | null),
          doorOutcome: params.outcome,
          completedBy: params.userId,
        },
      },
    });

    if (stop.contactId) {
      const mapped = toSupportLevel(params.outcome);
      await prisma.interaction.create({
        data: {
          contactId: stop.contactId,
          userId: params.userId,
          type: "door_knock",
          notes: params.notes,
          supportLevel: mapped ?? undefined,
          source: "canvass",
        },
      });

      if (mapped) {
        await prisma.contact.update({
          where: { id: stop.contactId },
          data: { supportLevel: mapped, lastContactedAt: new Date() },
        });
      }
    }

    await audit(prisma, "canvasser.door_completed", {
      campaignId: params.campaignId,
      userId: params.userId,
      entityType: "AssignmentStop",
      entityId: params.stopId,
      after: { outcome: params.outcome },
    });

    return updated;
  },

  async skipDoor(params: {
    userId: string;
    membershipId: string;
    role: Role;
    campaignId: string;
    stopId: string;
    reason: string;
  }) {
    await ensureStopAccess({
      stopId: params.stopId,
      campaignId: params.campaignId,
      userId: params.userId,
      membershipId: params.membershipId,
      role: params.role,
    });

    const updated = await prisma.assignmentStop.update({
      where: { id: params.stopId },
      data: {
        status: "skipped",
        exceptionType: "other",
        exceptionNotes: params.reason,
        notes: params.reason,
      },
    });

    await audit(prisma, "canvasser.door_skipped", {
      campaignId: params.campaignId,
      userId: params.userId,
      entityType: "AssignmentStop",
      entityId: params.stopId,
      after: { reason: params.reason },
    });

    return updated;
  },

  async addDoorNote(params: {
    userId: string;
    membershipId: string;
    role: Role;
    campaignId: string;
    stopId: string;
    note: string;
  }) {
    const stop = await ensureStopAccess({
      stopId: params.stopId,
      campaignId: params.campaignId,
      userId: params.userId,
      membershipId: params.membershipId,
      role: params.role,
    });

    const updated = await prisma.assignmentStop.update({
      where: { id: params.stopId },
      data: { notes: params.note },
    });

    if (stop.contactId) {
      await prisma.interaction.create({
        data: {
          contactId: stop.contactId,
          userId: params.userId,
          type: "note",
          notes: params.note,
          source: "canvass",
        },
      });
    }

    await audit(prisma, "canvasser.door_note_added", {
      campaignId: params.campaignId,
      userId: params.userId,
      entityType: "AssignmentStop",
      entityId: params.stopId,
      after: { note: params.note },
    });

    return updated;
  },
};

export const voterService = {
  async updateVoterOutcome(userId: string, campaignId: string, personId: string, outcome: string) {
    const contact = await prisma.contact.findFirst({ where: { id: personId, campaignId, deletedAt: null } });
    if (!contact) throw new Error("CONTACT_NOT_FOUND");

    const mapped = toSupportLevel(outcome);
    await prisma.contact.update({
      where: { id: personId },
      data: {
        supportLevel: mapped ?? contact.supportLevel,
        doNotContact: ["REFUSED", "OPPOSE"].includes(outcome) ? true : contact.doNotContact,
        isDeceased: outcome === "DECEASED" ? true : contact.isDeceased,
        lastContactedAt: new Date(),
      },
    });

    const interaction = await prisma.interaction.create({
      data: {
        contactId: personId,
        userId,
        type: "door_knock",
        notes: `Voter outcome: ${outcome}`,
        supportLevel: mapped ?? undefined,
        source: "canvass",
      },
    });

    await audit(prisma, "canvasser.voter_outcome_updated", {
      campaignId,
      userId,
      entityType: "Contact",
      entityId: personId,
      after: { outcome },
    });

    return interaction;
  },

  async updateCustomField(userId: string, campaignId: string, targetId: string, fieldId: string, value: {
    valueText?: string;
    valueBool?: boolean;
    valueNum?: number;
    valueDate?: string;
    valueList?: string[];
  }) {
    const contact = await prisma.contact.findFirst({ where: { id: targetId, campaignId, deletedAt: null } });
    if (!contact) throw new Error("CONTACT_NOT_FOUND");

    const field = await prisma.campaignField.findFirst({ where: { id: fieldId, campaignId } });
    if (!field) throw new Error("FIELD_NOT_FOUND");

    const updated = await prisma.customFieldValue.upsert({
      where: { contactId_fieldId: { contactId: targetId, fieldId } },
      update: {
        valueText: value.valueText ?? null,
        valueBool: value.valueBool ?? null,
        valueNum: value.valueNum ?? null,
        valueDate: value.valueDate ? new Date(value.valueDate) : null,
        valueList: value.valueList ?? [],
      },
      create: {
        contactId: targetId,
        fieldId,
        fieldKey: field.key,
        valueText: value.valueText ?? null,
        valueBool: value.valueBool ?? null,
        valueNum: value.valueNum ?? null,
        valueDate: value.valueDate ? new Date(value.valueDate) : null,
        valueList: value.valueList ?? [],
      },
    });

    await audit(prisma, "canvasser.custom_field_updated", {
      campaignId,
      userId,
      entityType: "CustomFieldValue",
      entityId: updated.id,
      after: { fieldId },
    });

    return updated;
  },
};

export const signService = {
  async createSignRequest(userId: string, campaignId: string, payload: {
    contactId?: string;
    address: string;
    city?: string;
    postalCode?: string;
    signType: string;
    quantity?: number;
    notes?: string;
    lat?: number;
    lng?: number;
  }) {
    if (payload.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: payload.contactId, campaignId, deletedAt: null } });
      if (!contact) throw new Error("CONTACT_NOT_FOUND");
    }

    const existing = await prisma.sign.findFirst({
      where: {
        campaignId,
        contactId: payload.contactId ?? null,
        address1: payload.address,
        signType: payload.signType,
        status: { in: ["requested", "scheduled", "installed"] },
      },
      select: { id: true },
    });
    if (existing) throw new Error("DUPLICATE_SIGN_REQUEST");

    const sign = await prisma.sign.create({
      data: {
        campaignId,
        contactId: payload.contactId,
        address1: payload.address,
        city: payload.city,
        postalCode: payload.postalCode,
        signType: payload.signType,
        quantity: payload.quantity ?? 1,
        notes: payload.notes,
        lat: payload.lat,
        lng: payload.lng,
        status: "requested",
      },
    });

    await audit(prisma, "canvasser.sign_request_created", {
      campaignId,
      userId,
      entityType: "Sign",
      entityId: sign.id,
      after: { signType: sign.signType, quantity: sign.quantity },
    });

    return sign;
  },

  async updateSignRequestStatus(userId: string, campaignId: string, signRequestId: string, status: string) {
    const sign = await prisma.sign.findFirst({ where: { id: signRequestId, campaignId } });
    if (!sign) throw new Error("SIGN_REQUEST_NOT_FOUND");

    const updated = await prisma.sign.update({
      where: { id: signRequestId },
      data: {
        status: status.toLowerCase() as Prisma.SignUpdateInput["status"],
        installedAt: status === "INSTALLED" ? new Date() : sign.installedAt,
      },
    });

    await audit(prisma, "canvasser.sign_request_status_updated", {
      campaignId,
      userId,
      entityType: "Sign",
      entityId: signRequestId,
      before: { status: sign.status },
      after: { status: updated.status },
    });

    return updated;
  },
};

export const volunteerService = {
  async createVolunteerLead(userId: string, campaignId: string, payload: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    availability?: string;
    hasCar?: boolean;
    preferredRoles?: string[];
    skills?: string[];
    notes?: string;
    contactId?: string;
    sourceStopId?: string;
    consentToContact?: boolean;
  }) {
    const existing = await prisma.volunteerLead.findFirst({
      where: {
        campaignId,
        OR: [
          payload.email ? { email: payload.email } : undefined,
          payload.phone ? { phone: payload.phone } : undefined,
        ].filter(Boolean) as Prisma.VolunteerLeadWhereInput[],
      },
    });
    if (existing) throw new Error("DUPLICATE_VOLUNTEER_LEAD");

    const lead = await prisma.volunteerLead.create({
      data: {
        campaignId,
        contactId: payload.contactId,
        sourceStopId: payload.sourceStopId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        availability: payload.availability,
        hasCar: payload.hasCar ?? false,
        preferredRoles: payload.preferredRoles ?? [],
        skills: payload.skills ?? [],
        notes: payload.notes,
        consentToContact: payload.consentToContact ?? false,
        capturedByUserId: userId,
      },
    });

    await prisma.task.create({
      data: {
        campaignId,
        createdById: userId,
        title: `Volunteer follow-up: ${payload.name}`,
        description: payload.notes ?? "Captured from canvasser app",
        priority: TaskPriority.high,
        category: "VOLUNTEERS",
      },
    });

    await audit(prisma, "canvasser.volunteer_lead_created", {
      campaignId,
      userId,
      entityType: "VolunteerLead",
      entityId: lead.id,
      after: { name: lead.name, email: lead.email, phone: lead.phone },
    });

    return lead;
  },
};

export const litService = {
  async logLitDrop(userId: string, campaignId: string, payload: {
    missionId?: string;
    stopId?: string;
    contactId?: string;
    litPieceId?: string;
    scope?: string;
    notes?: string;
    lat?: number;
    lng?: number;
  }) {
    const log = await prisma.litDropLog.create({
      data: {
        campaignId,
        missionId: payload.missionId,
        stopId: payload.stopId,
        contactId: payload.contactId,
        litPieceId: payload.litPieceId,
        scope: payload.scope ?? "door",
        notes: payload.notes,
        latitude: payload.lat,
        longitude: payload.lng,
        createdById: userId,
      },
    });

    await audit(prisma, "canvasser.lit_drop_logged", {
      campaignId,
      userId,
      entityType: "LitDropLog",
      entityId: log.id,
      after: { scope: log.scope },
    });

    return log;
  },

  async batchLogLitDrop(userId: string, campaignId: string, payload: Array<{
    missionId?: string;
    stopId?: string;
    contactId?: string;
    litPieceId?: string;
    scope?: string;
    notes?: string;
    lat?: number;
    lng?: number;
  }>) {
    const created = await prisma.$transaction(
      payload.map((item) =>
        prisma.litDropLog.create({
          data: {
            campaignId,
            missionId: item.missionId,
            stopId: item.stopId,
            contactId: item.contactId,
            litPieceId: item.litPieceId,
            scope: item.scope ?? "door",
            notes: item.notes,
            latitude: item.lat,
            longitude: item.lng,
            createdById: userId,
          },
        }),
      ),
    );

    await audit(prisma, "canvasser.lit_drop_batch_logged", {
      campaignId,
      userId,
      entityType: "LitDropLog",
      entityId: `batch:${created.length}`,
      after: { count: created.length },
    });

    return created;
  },
};

export const candidatePingService = {
  async createCandidatePing(userId: string, campaignId: string, payload: {
    stopId?: string;
    contactId?: string;
    candidateId?: string;
    priority?: string;
    safeNote?: string;
    context?: Record<string, unknown>;
  }) {
    const ping = await prisma.candidatePing.create({
      data: {
        campaignId,
        stopId: payload.stopId,
        contactId: payload.contactId,
        candidateId: payload.candidateId,
        requestedById: userId,
        priority: payload.priority ?? "normal",
        safeNote: payload.safeNote,
        context: payload.context,
        status: "sent",
      },
    });

    await audit(prisma, "canvasser.candidate_ping_sent", {
      campaignId,
      userId,
      entityType: "CandidatePing",
      entityId: ping.id,
      after: { priority: ping.priority },
    });

    return ping;
  },

  async updateCandidatePingStatus(userId: string, campaignId: string, pingId: string, status: string) {
    const ping = await prisma.candidatePing.findFirst({ where: { id: pingId, campaignId } });
    if (!ping) throw new Error("CANDIDATE_PING_NOT_FOUND");

    const updated = await prisma.candidatePing.update({
      where: { id: pingId },
      data: { status: status.toLowerCase() },
    });

    await audit(prisma, "canvasser.candidate_ping_status_updated", {
      campaignId,
      userId,
      entityType: "CandidatePing",
      entityId: pingId,
      before: { status: ping.status },
      after: { status: updated.status },
    });

    return updated;
  },
};

export const pcsInviteService = {
  async createPCSInvite(userId: string, campaignId: string, payload: {
    contactId?: string;
    householdId?: string;
    stopId?: string;
    channel: "qr" | "sms" | "email" | "copy" | "verbal";
    inviteLink?: string;
  }) {
    const invite = await prisma.pCSInvite.create({
      data: {
        campaignId,
        contactId: payload.contactId,
        householdId: payload.householdId,
        stopId: payload.stopId,
        channel: payload.channel,
        inviteLink: payload.inviteLink,
        sentById: userId,
        status: "sent",
      },
    });

    await audit(prisma, "canvasser.pcs_invite_created", {
      campaignId,
      userId,
      entityType: "PCSInvite",
      entityId: invite.id,
      after: { channel: invite.channel },
    });

    return invite;
  },
};

const ADONI_ACTION_TYPES = [
  "UPDATE_VOTER_STATUS",
  "UPDATE_HOUSEHOLD_STATUS",
  "CREATE_SIGN_REQUEST",
  "CREATE_VOLUNTEER_LEAD",
  "CREATE_FOLLOWUP_TASK",
  "ADD_NOTE",
  "LOG_LIT_DROP",
  "INVITE_TO_PCS",
  "FLAG_SAFETY_ISSUE",
  "PING_CANDIDATE",
  "REQUEST_MANAGER_REVIEW",
] as const;

export interface ParsedTranscriptAction {
  actionType: string;
  label: string;
  payload: Record<string, unknown>;
  riskLevel: string;
  requiresConfirmation: boolean;
  missingFields: string[];
}

export function parseTranscriptRules(transcript: string): ParsedTranscriptAction[] {
  const lower = transcript.toLowerCase();
  const actions: ParsedTranscriptAction[] = [];

  if (lower.includes("support")) {
    actions.push({
      actionType: "UPDATE_VOTER_STATUS",
      label: "Set voter status to support",
      payload: { outcome: "STRONG_SUPPORT" },
      riskLevel: "medium",
      requiresConfirmation: true,
      missingFields: [],
    });
  }

  if (lower.includes("sign")) {
    actions.push({
      actionType: "CREATE_SIGN_REQUEST",
      label: "Create sign request",
      payload: { signType: "small_lawn", quantity: 1 },
      riskLevel: "medium",
      requiresConfirmation: true,
      missingFields: ["address"],
    });
  }

  if (lower.includes("volunteer")) {
    actions.push({
      actionType: "CREATE_VOLUNTEER_LEAD",
      label: "Create volunteer lead",
      payload: { availability: lower.includes("saturday") ? "Saturday" : null, hasCar: lower.includes("car") },
      riskLevel: "medium",
      requiresConfirmation: true,
      missingFields: [],
    });
  }

  if (lower.includes("not home")) {
    actions.push({
      actionType: "LOG_LIT_DROP",
      label: "Log not-home lit drop",
      payload: { outcome: "NOT_HOME" },
      riskLevel: "low",
      requiresConfirmation: true,
      missingFields: [],
    });
  }

  if (lower.includes("hostile") || lower.includes("do not return")) {
    actions.push({
      actionType: "FLAG_SAFETY_ISSUE",
      label: "Flag safety issue and do-not-canvass",
      payload: { reason: "hostile_or_do_not_return" },
      riskLevel: "high",
      requiresConfirmation: true,
      missingFields: [],
    });
  }

  if (actions.length === 0) {
    actions.push({
      actionType: "ADD_NOTE",
      label: "Save transcript as note",
      payload: { mode: "note_only" },
      riskLevel: "low",
      requiresConfirmation: true,
      missingFields: [],
    });
  }

  return actions;
}

export const adoniFieldService = {
  async createTranscript(userId: string, campaignId: string, payload: {
    missionId?: string;
    stopId?: string;
    personId?: string;
    mode?: "voice" | "text";
    transcript: string;
  }) {
    const row = await prisma.adoniTranscript.create({
      data: {
        campaignId,
        userId,
        missionId: payload.missionId,
        stopId: payload.stopId,
        personId: payload.personId,
        mode: payload.mode ?? "text",
        transcript: payload.transcript,
      },
    });

    await audit(prisma, "canvasser.adoni_transcript_created", {
      campaignId,
      userId,
      entityType: "AdoniTranscript",
      entityId: row.id,
      after: { mode: row.mode },
    });

    return row;
  },

  async parseFieldCommand(userId: string, campaignId: string, transcriptId: string) {
    const transcript = await prisma.adoniTranscript.findFirst({ where: { id: transcriptId, campaignId } });
    if (!transcript) throw new Error("TRANSCRIPT_NOT_FOUND");

    const parsed = parseTranscriptRules(transcript.transcript);
    const confidence = parsed.some((p) => p.actionType !== "ADD_NOTE") ? 0.82 : 0.55;

    await prisma.adoniParsedAction.deleteMany({ where: { transcriptId } });

    const created = await prisma.$transaction(
      parsed.map((p) =>
        prisma.adoniParsedAction.create({
          data: {
            transcriptId,
            campaignId,
            actionType: p.actionType,
            label: p.label,
            payload: p.payload,
            riskLevel: p.riskLevel,
            requiresConfirmation: p.requiresConfirmation,
            missingFields: p.missingFields,
            status: "PREVIEWED",
          },
        }),
      ),
    );

    await prisma.adoniTranscript.update({
      where: { id: transcriptId },
      data: { parsed: true, confidence },
    });

    await audit(prisma, "canvasser.adoni_actions_previewed", {
      campaignId,
      userId,
      entityType: "AdoniTranscript",
      entityId: transcriptId,
      after: { count: created.length, confidence },
    });

    return {
      transcriptId,
      confidence,
      proposedActions: created,
      supportedActionTypes: ADONI_ACTION_TYPES,
    };
  },

  async executeConfirmedActions(userId: string, campaignId: string, transcriptId: string, approvedActionIds: string[]) {
    const transcript = await prisma.adoniTranscript.findFirst({ where: { id: transcriptId, campaignId } });
    if (!transcript) throw new Error("TRANSCRIPT_NOT_FOUND");

    const actions = await prisma.adoniParsedAction.findMany({
      where: { id: { in: approvedActionIds }, transcriptId, campaignId },
    });

    const results: Array<{ actionId: string; status: "EXECUTED" | "FAILED"; error?: string }> = [];

    for (const action of actions) {
      try {
        if (action.actionType === "FLAG_SAFETY_ISSUE") {
          const payload = (action.payload ?? {}) as Record<string, unknown>;
          await prisma.safetyFlag.create({
            data: {
              campaignId,
              stopId: transcript.stopId,
              contactId: transcript.personId,
              reason: String(payload.reason ?? "safety_flag"),
              notes: transcript.transcript,
              createdById: userId,
            },
          });
        }

        if (action.actionType === "ADD_NOTE" && transcript.personId) {
          await prisma.interaction.create({
            data: {
              contactId: transcript.personId,
              userId,
              type: "note",
              notes: transcript.transcript,
              source: "canvass",
            },
          });
        }

        await prisma.adoniParsedAction.update({ where: { id: action.id }, data: { status: "EXECUTED" } });
        await prisma.adoniExecutionLog.create({
          data: {
            campaignId,
            transcriptId,
            actionId: action.id,
            executedById: userId,
            status: "EXECUTED",
            result: { ok: true },
          },
        });

        results.push({ actionId: action.id, status: "EXECUTED" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown action execution error";
        await prisma.adoniParsedAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
        await prisma.adoniExecutionLog.create({
          data: {
            campaignId,
            transcriptId,
            actionId: action.id,
            executedById: userId,
            status: "FAILED",
            error: message,
          },
        });

        results.push({ actionId: action.id, status: "FAILED", error: message });
      }
    }

    await audit(prisma, "canvasser.adoni_actions_executed", {
      campaignId,
      userId,
      entityType: "AdoniTranscript",
      entityId: transcriptId,
      after: { approvedCount: approvedActionIds.length, executed: results },
    });

    return results;
  },
};

export const offlineSyncService = {
  async processOfflineSyncBatch(userId: string, campaignId: string, payload: {
    deviceId: string;
    lastSyncAt?: string;
    events: Array<{
      clientEventId: string;
      entityType: string;
      actionType: string;
      payload: Prisma.InputJsonValue;
      createdAt?: string;
      localVersion?: number;
    }>;
  }) {
    const results: Array<{
      clientEventId: string;
      status: "SYNCED" | "FAILED" | "CONFLICT";
      serverId?: string;
      error?: string;
      conflict?: Record<string, unknown>;
    }> = [];

    for (const event of payload.events) {
      const existing = await prisma.offlineSyncEvent.findFirst({
        where: { campaignId, clientEventId: event.clientEventId },
      });
      if (existing) {
        results.push({
          clientEventId: event.clientEventId,
          status: existing.status === "CONFLICT" ? "CONFLICT" : existing.status === "FAILED" ? "FAILED" : "SYNCED",
          serverId: existing.id,
          error: existing.error ?? undefined,
          conflict: (existing.conflict as Record<string, unknown> | null) ?? undefined,
        });
        continue;
      }

      try {
        const created = await prisma.offlineSyncEvent.create({
          data: {
            campaignId,
            userId,
            deviceId: payload.deviceId,
            clientEventId: event.clientEventId,
            entityType: event.entityType,
            actionType: event.actionType,
            payload: event.payload,
            localVersion: event.localVersion,
            status: "SYNCED",
            processedAt: new Date(),
          },
        });

        results.push({ clientEventId: event.clientEventId, status: "SYNCED", serverId: created.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync event failed";
        await prisma.offlineSyncEvent.create({
          data: {
            campaignId,
            userId,
            deviceId: payload.deviceId,
            clientEventId: event.clientEventId,
            entityType: event.entityType,
            actionType: event.actionType,
            payload: event.payload,
            localVersion: event.localVersion,
            status: "FAILED",
            error: message,
            processedAt: new Date(),
          },
        });

        results.push({ clientEventId: event.clientEventId, status: "FAILED", error: message });
      }
    }

    await audit(prisma, "canvasser.offline_sync_processed", {
      campaignId,
      userId,
      entityType: "OfflineSyncEvent",
      entityId: payload.deviceId,
      after: { processed: payload.events.length },
    });

    return {
      syncId: `sync_${Date.now()}`,
      status: results.some((r) => r.status === "FAILED") ? "partial_failure" : "ok",
      results,
      serverTime: new Date().toISOString(),
    };
  },

  async getSyncStatus(userId: string, campaignId: string, deviceId: string) {
    const events = await prisma.offlineSyncEvent.findMany({
      where: { userId, campaignId, deviceId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const counts = events.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { counts, latest: events[0] ?? null };
  },
};
