import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { decideVerification } from "@/lib/intel/verifier";
import { normalizeOffice } from "@/lib/intel/phrases";

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
  const verificationStatus = searchParams.get("verificationStatus");
  const reviewStatus = searchParams.get("reviewStatus");
  const jurisdiction = searchParams.get("jurisdiction");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));

  const where = {
    ...(verificationStatus ? { verificationStatus: verificationStatus as "pending" | "auto_verified" | "manually_verified" | "rejected" | "duplicate" } : {}),
    ...(reviewStatus ? { reviewStatus: reviewStatus as "unreviewed" | "in_review" | "reviewed" } : {}),
    ...(jurisdiction ? { jurisdictionNormalized: { contains: jurisdiction, mode: "insensitive" as const } } : {}),
  };

  const [total, leads] = await Promise.all([
    prisma.candidateLead.count({ where }),
    prisma.candidateLead.findMany({
      where,
      orderBy: [{ confidenceScore: "desc" }, { detectedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        detectedNameRaw: true,
        canonicalName: true,
        officeRaw: true,
        officeNormalized: true,
        jurisdictionRaw: true,
        jurisdictionNormalized: true,
        wardOrRidingRaw: true,
        partyRaw: true,
        sourceType: true,
        sourceUrl: true,
        detectedAt: true,
        confidenceScore: true,
        verificationStatus: true,
        reviewStatus: true,
        reviewNotes: true,
        createdAt: true,
        dataSource: { select: { name: true, authorityScore: true } },
        _count: { select: { newsSignals: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), leads });
}

const CreateLeadSchema = z.object({
  detectedNameRaw: z.string().min(1),
  officeRaw: z.string().min(1),
  jurisdictionRaw: z.string().min(1),
  wardOrRidingRaw: z.string().nullable().optional(),
  partyRaw: z.string().nullable().optional(),
  sourceUrl: z.string().url(),
  confidenceScore: z.number().min(0).max(100).default(50),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateLeadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const user = session!.user as { id?: string };
  const d = parsed.data;

  const verification = decideVerification({
    confidenceScore: d.confidenceScore,
    hasCandidateName: true,
    hasOffice: true,
    hasJurisdiction: true,
  });

  const lead = await prisma.candidateLead.create({
    data: {
      detectedNameRaw: d.detectedNameRaw,
      officeRaw: d.officeRaw,
      officeNormalized: normalizeOffice(d.officeRaw),
      jurisdictionRaw: d.jurisdictionRaw,
      jurisdictionNormalized: d.jurisdictionRaw.toLowerCase().trim(),
      wardOrRidingRaw: d.wardOrRidingRaw ?? null,
      partyRaw: d.partyRaw ?? null,
      sourceType: "manual",
      sourceUrl: d.sourceUrl,
      confidenceScore: d.confidenceScore,
      verificationStatus: verification.status,
      reviewStatus: "reviewed",
      reviewedByUserId: user.id ?? null,
      reviewedAt: new Date(),
    },
  });

  audit(prisma, "cie.lead.created", {
    campaignId: "system",
    userId: user.id ?? "unknown",
    entityId: lead.id,
    entityType: "CandidateLead",
    ip: req.headers.get("x-forwarded-for"),
    details: { name: lead.detectedNameRaw, office: lead.officeRaw },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
