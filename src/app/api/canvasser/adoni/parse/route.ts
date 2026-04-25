/**
 * POST /api/canvasser/adoni/parse
 * Parses a canvasser voice transcript into structured actions using rule-based NLP.
 * Returns a list of detected intents that the canvasser can confirm before executing.
 *
 * Body: { campaignId: string, text: string, contactId?: string }
 *
 * Returns: { actions: ParsedAction[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mobileApiAuth } from "@/lib/auth/helpers";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";

const schema = z.object({
  campaignId: z.string().min(1),
  text: z.string().min(1).max(5000),
  contactId: z.string().optional(),
});

// ── Rule-based intent extraction ──────────────────────────────────────────────

type ActionType =
  | "set_support_level"
  | "request_sign"
  | "flag_volunteer"
  | "flag_follow_up"
  | "add_note"
  | "mark_do_not_contact"
  | "skip_stop";

interface ParsedAction {
  type: ActionType;
  confidence: "high" | "medium" | "low";
  params: Record<string, unknown>;
  displayText: string;
}

const SUPPORT_PATTERNS: Array<{
  patterns: RegExp[];
  level: string;
  display: string;
}> = [
  {
    patterns: [
      /\bstrong(ly)?\s+support\b/i,
      /\bfully\s+on\s+board\b/i,
      /\bvoting\s+for\s+(us|our|the\s+candidate)\b/i,
      /\b(definite|absolute)\s+(yes|supporter)\b/i,
    ],
    level: "strong_support",
    display: "Strong Support",
  },
  {
    patterns: [
      /\bleaning\s+(towards?\s+)?(us|support|yes)\b/i,
      /\bprobably\s+(going\s+to\s+)?vote\s+for\b/i,
      /\blikely\s+supporter\b/i,
    ],
    level: "leaning_support",
    display: "Leaning Support",
  },
  {
    patterns: [
      /\bundecided\b/i,
      /\bnot\s+sure\b/i,
      /\bon\s+the\s+fence\b/i,
      /\bthinking\s+about\s+it\b/i,
      /\bmaybe\b/i,
    ],
    level: "undecided",
    display: "Undecided",
  },
  {
    patterns: [
      /\bleaning\s+(towards?\s+)?(opposition|no|against)\b/i,
      /\bprobably\s+not\b/i,
    ],
    level: "leaning_opposition",
    display: "Leaning Opposition",
  },
  {
    patterns: [
      /\bstrong(ly)?\s+oppose\b/i,
      /\bvoting\s+against\b/i,
      /\bdefinitely\s+not\b/i,
      /\bopponent\s+supporter\b/i,
    ],
    level: "strong_opposition",
    display: "Strong Opposition",
  },
];

const SIGN_PATTERNS = [
  /\bwants?\s+(a\s+)?sign\b/i,
  /\bsign\s+request\b/i,
  /\bput\s+up\s+a\s+sign\b/i,
  /\blawn\s+sign\b/i,
  /\bwindow\s+sign\b/i,
  /\bflag\s+(for\s+)?sign\b/i,
];

const VOLUNTEER_PATTERNS = [
  /\bwants?\s+to\s+volunteer\b/i,
  /\bvolunteer\s+interest\b/i,
  /\bcan\s+help\b/i,
  /\bwill\s+help\b/i,
  /\binterested\s+in\s+(helping|volunteering)\b/i,
  /\bflag\s+(as\s+)?volunteer\b/i,
];

const FOLLOW_UP_PATTERNS = [
  /\bfollow[\s-]?up\b/i,
  /\bcall\s+back\b/i,
  /\bcheck\s+back\b/i,
  /\bneed\s+more\s+info\b/i,
  /\breachout\b/i,
];

const DNC_PATTERNS = [
  /\bdo\s+not\s+contact\b/i,
  /\bdon'?t\s+contact\b/i,
  /\bremove\s+from\s+list\b/i,
  /\bno\s+more\s+visits\b/i,
  /\bhostile\b/i,
  /\brefused\b/i,
];

const SKIP_PATTERNS = [
  /\bskip\s+(this\s+)?stop\b/i,
  /\bnot\s+home\b/i,
  /\bno\s+answer\b/i,
  /\bno\s+one\s+(home|there)\b/i,
  /\bmoved\b/i,
];

function extractActions(text: string, contactId?: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const lower = text.toLowerCase();

  // Support level
  for (const { patterns, level, display } of SUPPORT_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      actions.push({
        type: "set_support_level",
        confidence: "high",
        params: { supportLevel: level, contactId },
        displayText: `Set voter support to "${display}"`,
      });
      break;
    }
  }

  // Sign request
  if (SIGN_PATTERNS.some((p) => p.test(text))) {
    actions.push({
      type: "request_sign",
      confidence: "high",
      params: { contactId },
      displayText: "Create lawn sign request",
    });
  }

  // Volunteer
  if (VOLUNTEER_PATTERNS.some((p) => p.test(text))) {
    actions.push({
      type: "flag_volunteer",
      confidence: "high",
      params: { contactId },
      displayText: "Flag contact as volunteer interest",
    });
  }

  // Follow-up
  if (FOLLOW_UP_PATTERNS.some((p) => p.test(text))) {
    actions.push({
      type: "flag_follow_up",
      confidence: "medium",
      params: { contactId },
      displayText: "Flag for follow-up",
    });
  }

  // Do not contact
  if (DNC_PATTERNS.some((p) => p.test(text))) {
    actions.push({
      type: "mark_do_not_contact",
      confidence: "high",
      params: { contactId },
      displayText: "Mark contact as Do Not Contact",
    });
  }

  // Skip stop
  if (SKIP_PATTERNS.some((p) => p.test(text))) {
    actions.push({
      type: "skip_stop",
      confidence: "medium",
      params: { contactId },
      displayText: "Skip this stop (no answer / not home)",
    });
  }

  // If nothing was found, add a generic note action
  if (actions.length === 0) {
    actions.push({
      type: "add_note",
      confidence: "low",
      params: { contactId, note: text.slice(0, 500) },
      displayText: "Save as canvasser note",
    });
  }

  return actions;
}

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { text, contactId } = parsed.data;
  const safeText = sanitizePrompt(text) ?? text;
  const actions = extractActions(safeText, contactId);

  return NextResponse.json({ data: { actions, parsedText: safeText } });
}
