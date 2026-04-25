/**
 * Results OCR
 *
 * Accepts a base64-encoded image (polling station results printout) and
 * uses Claude Vision to extract candidate names and vote counts.
 *
 * Returns structured data for the staff member to review before committing
 * it to the results entry system via POST /api/results/entry.
 *
 * The extracted entry is flagged ocrAssisted=true in LiveResult so reviewers
 * know it came from a photo scan and needs a second human confirmation.
 *
 * Auth: any active campaign member
 * Rate: standard API limit (not a public endpoint)
 */
import { NextRequest, NextResponse } from "next/server";
import { mobileApiAuth as apiAuth } from "@/lib/auth/helpers";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const ocrSchema = z.object({
  campaignId: z.string().min(1),
  imageBase64: z.string().min(100).max(5_242_880), // base64-encoded image — 5MB max (~3.75MB actual)
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
  // Pre-populated from scrutineer assignment — or entered manually
  hint: z.object({
    pollingStation: z.string().max(200).optional(),
    municipality: z.string().max(200).optional(),
    ward: z.string().max(100).optional(),
    province: z.string().max(2).optional(),
  }).optional(),
});

export interface OcrResult {
  pollingStation: string | null;
  municipality: string | null;
  ward: string | null;
  province: string | null;
  office: string | null;
  percentReporting: number;
  candidates: Array<{ name: string; party: string | null; votes: number }>;
  totalVotes: number | null;
  rejectedBallots: number | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = ocrSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, imageBase64, mimeType, hint } = parsed.data;

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR service not configured" }, { status: 503 });
  }

  // Sanitize all hint fields BEFORE embedding in the prompt — prevents prompt injection
  // via crafted values in pollingStation, municipality, ward, or province fields.
  const sanitizedHint = hint ? {
    pollingStation: hint.pollingStation ? (sanitizePrompt(hint.pollingStation) ?? null) : null,
    municipality: hint.municipality ? (sanitizePrompt(hint.municipality) ?? null) : null,
    ward: hint.ward ? (sanitizePrompt(hint.ward) ?? null) : null,
    province: hint.province ? (sanitizePrompt(hint.province) ?? null) : null,
  } : null;

  const hintText = sanitizedHint
    ? `Context provided: polling station "${sanitizedHint.pollingStation ?? "unknown"}", municipality "${sanitizedHint.municipality ?? "unknown"}", ward "${sanitizedHint.ward ?? "unknown"}".`
    : "";

  const systemPrompt = sanitizePrompt(`You are an elections results data extractor. Extract vote tallies from a Canadian polling station results printout. Return only valid JSON, no other text.`);

  const userPrompt = sanitizePrompt(`Extract all election results from this polling station printout image.
${hintText}

Return a JSON object with exactly this structure:
{
  "pollingStation": "string or null",
  "municipality": "string or null",
  "ward": "string or null",
  "province": "string or null (2-letter code, e.g. ON)",
  "office": "string or null (e.g. Mayor, Councillor Ward 5)",
  "percentReporting": number (0-100, default 100 for a final printout),
  "candidates": [
    { "name": "string", "party": "string or null", "votes": number }
  ],
  "totalVotes": number or null,
  "rejectedBallots": number or null,
  "rawText": "all text you can read from the image, verbatim",
  "confidence": "high" or "medium" or "low",
  "warnings": ["any issues or unclear items"]
}

Rules:
- candidates must be sorted by votes descending
- If a value is illegible, use null not a guess
- confidence is "high" if all candidate names and vote counts are clearly legible
- Add a warning for any number that was ambiguous`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[results/ocr] Claude API error:", response.status, errText);
    return NextResponse.json({ error: "OCR extraction failed" }, { status: 502 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Parse the JSON from Claude's response
  let extracted: OcrResult;
  try {
    // Claude might wrap in ```json ... ``` — strip it
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    extracted = JSON.parse(cleaned) as OcrResult;
  } catch {
    console.error("[results/ocr] Failed to parse Claude response:", text);
    return NextResponse.json({ error: "OCR returned unparseable data", raw: text }, { status: 422 });
  }

  // Merge sanitized hint context if Claude couldn't read station info from image
  if (sanitizedHint) {
    if (!extracted.pollingStation && sanitizedHint.pollingStation) extracted.pollingStation = sanitizedHint.pollingStation;
    if (!extracted.municipality && sanitizedHint.municipality) extracted.municipality = sanitizedHint.municipality;
    if (!extracted.ward && sanitizedHint.ward) extracted.ward = sanitizedHint.ward;
    if (!extracted.province && sanitizedHint.province) extracted.province = sanitizedHint.province;
  }

  return NextResponse.json({ data: extracted });
}
