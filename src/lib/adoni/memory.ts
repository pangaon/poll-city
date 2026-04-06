// Adoni user memory — learns from conversations and remembers across sessions.
// Stored per-user per-campaign in AdoniUserMemory table.

import prisma from "@/lib/db/prisma";

export interface UserMemory {
  preferredName: string | null;
  communicationStyle: string;
  prefersBrief: boolean;
  topPriorities: string[];
  stressPoints: string[];
  expertiseAreas: string[];
  facts: string[];
  decisions: string[];
  openItems: string[];
  lastTopics: string[];
  unresolvedItems: string[];
}

const EMPTY_MEMORY: UserMemory = {
  preferredName: null,
  communicationStyle: "balanced",
  prefersBrief: false,
  topPriorities: [],
  stressPoints: [],
  expertiseAreas: [],
  facts: [],
  decisions: [],
  openItems: [],
  lastTopics: [],
  unresolvedItems: [],
};

export async function loadMemory(userId: string, campaignId: string): Promise<UserMemory> {
  try {
    const row = await prisma.adoniUserMemory.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    });
    if (!row) return EMPTY_MEMORY;
    return {
      preferredName: row.preferredName,
      communicationStyle: row.communicationStyle ?? "balanced",
      prefersBrief: row.prefersBrief,
      topPriorities: (row.topPriorities as string[]) ?? [],
      stressPoints: (row.stressPoints as string[]) ?? [],
      expertiseAreas: (row.expertiseAreas as string[]) ?? [],
      facts: (row.facts as string[]) ?? [],
      decisions: (row.decisions as string[]) ?? [],
      openItems: (row.openItems as string[]) ?? [],
      lastTopics: (row.lastTopics as string[]) ?? [],
      unresolvedItems: (row.unresolvedItems as string[]) ?? [],
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

// Extract intent signals from user messages and update memory.
// Called after every conversation turn.
export async function updateMemory(
  userId: string,
  campaignId: string,
  userMessage: string,
  existing: UserMemory,
): Promise<void> {
  try {
    const lower = userMessage.toLowerCase();
    const topic = userMessage.slice(0, 60);

    // Detect decision signals
    const isDecision =
      lower.includes("we decided") ||
      lower.includes("we are going to") ||
      lower.includes("we're going to") ||
      lower.includes("let's not") ||
      lower.includes("let us not") ||
      lower.includes("the plan is");

    // Detect fact signals
    const isFact =
      lower.includes("we never") ||
      lower.includes("we always") ||
      lower.includes("remember that") ||
      lower.includes("never canvass") ||
      lower.includes("always call") ||
      lower.includes("important:") ||
      lower.includes("fyi:");

    // Detect open item signals
    const isOpenItem =
      lower.includes("remind me to") ||
      lower.includes("i need to") ||
      lower.includes("we still need") ||
      lower.includes("don't forget") ||
      lower.includes("TODO");

    // Detect name preference
    let preferredName = existing.preferredName;
    const nameMatch = lower.match(/call me (\w+)/);
    if (nameMatch) preferredName = nameMatch[1];

    // Detect brevity preference
    let prefersBrief = existing.prefersBrief;
    if (lower.includes("keep it short") || lower.includes("be brief") || lower.includes("tldr")) {
      prefersBrief = true;
    }

    const lastTopics = [topic, ...existing.lastTopics].slice(0, 5);
    const decisions = isDecision ? [...existing.decisions, userMessage].slice(-10) : existing.decisions;
    const facts = isFact ? [...existing.facts, userMessage].slice(-10) : existing.facts;
    const openItems = isOpenItem ? [...existing.openItems, userMessage].slice(-10) : existing.openItems;

    await prisma.adoniUserMemory.upsert({
      where: { userId_campaignId: { userId, campaignId } },
      create: {
        userId,
        campaignId,
        preferredName,
        prefersBrief,
        lastTopics,
        decisions,
        facts,
        openItems,
      },
      update: {
        preferredName,
        prefersBrief,
        lastTopics,
        decisions: isDecision ? decisions : undefined,
        facts: isFact ? facts : undefined,
        openItems: isOpenItem ? openItems : undefined,
      },
    });
  } catch (e) {
    console.error("[adoni/memory] update failed:", e);
  }
}

// Build greeting from memory — personal, context-aware, non-creepy.
export function buildGreeting(memory: UserMemory, userName: string, daysToElection: number | null): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const name = memory.preferredName ?? userName.split(" ")[0] ?? "there";

  if (daysToElection === 0) {
    return `It's election day, ${name}. Polls close at 8pm. What do we need right now?`;
  }

  if (memory.openItems.length > 0) {
    const last = memory.openItems[memory.openItems.length - 1];
    return `Good ${time}, ${name}. Last time we talked you mentioned: "${last.slice(0, 60)}". Did that happen?`;
  }

  if (memory.stressPoints.length > 0) {
    return `Good ${time}, ${name}. I've been keeping an eye on ${memory.stressPoints[0]} for you.`;
  }

  if (daysToElection !== null && daysToElection <= 10) {
    return `Good ${time}, ${name}. ${daysToElection} days out. Every hour counts. What do we need?`;
  }

  if (daysToElection !== null) {
    return `Good ${time}, ${name}. ${daysToElection} days out. What do we need today?`;
  }

  return `Good ${time}, ${name}. What can we work on together?`;
}
