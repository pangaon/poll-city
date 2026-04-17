import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";
import {
  checkOutreachEligibility,
  recordOutreachAttempt,
  markOutreachSent,
  markOutreachFailed,
} from "@/lib/intel/outreach";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const u = session.user;
  return u?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));

  const where = status ? { status: status as "pending" | "sent" | "delivered" | "bounced" | "failed" | "converted" } : {};

  const [total, attempts] = await Promise.all([
    prisma.candidateOutreachAttempt.count({ where }),
    prisma.candidateOutreachAttempt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        candidateProfile: { select: { fullName: true, office: true, jurisdictionRef: true } },
        candidateLead: { select: { detectedNameRaw: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), attempts });
}

const InitiateOutreachSchema = z.object({
  candidateProfileId: z.string(),
  outreachType: z.enum(["claim_profile", "introduction", "follow_up"]),
  channel: z.enum(["email", "form_submission", "manual"]),
  destination: z.string().nullable().optional(),
  messageTemplateKey: z.string().nullable().optional(),
});

const UpdateAttemptSchema = z.object({
  attemptId: z.string(),
  action: z.enum(["mark_sent", "mark_failed"]),
  errorMsg: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session!.user as { id?: string };
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;

  // Distinguish between initiate vs update
  if (body && "action" in body && (body["action"] === "mark_sent" || body["action"] === "mark_failed")) {
    const parsed = UpdateAttemptSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (parsed.data.action === "mark_sent") {
      await markOutreachSent(parsed.data.attemptId);
    } else {
      await markOutreachFailed(parsed.data.attemptId, parsed.data.errorMsg ?? "Unknown error");
    }
    return NextResponse.json({ success: true });
  }

  const parsed = InitiateOutreachSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const eligibility = await checkOutreachEligibility(parsed.data.candidateProfileId);
  if (!eligibility.eligible) {
    return NextResponse.json({ eligible: false, reason: eligibility.reason }, { status: 409 });
  }

  const attemptId = await recordOutreachAttempt({
    candidateProfileId: parsed.data.candidateProfileId,
    outreachType: parsed.data.outreachType,
    channel: parsed.data.channel,
    destination: parsed.data.destination ?? null,
    messageVersion: "v1",
    messageTemplateKey: parsed.data.messageTemplateKey ?? null,
    initiatedBy: user.id ?? "system",
  });

  audit(prisma, "cie.outreach.initiated", {
    campaignId: "system",
    userId: user.id ?? "unknown",
    entityId: attemptId,
    entityType: "CandidateOutreachAttempt",
    ip: req.headers.get("x-forwarded-for"),
    details: { profileId: parsed.data.candidateProfileId, type: parsed.data.outreachType },
  });

  return NextResponse.json({ attemptId }, { status: 201 });
}
