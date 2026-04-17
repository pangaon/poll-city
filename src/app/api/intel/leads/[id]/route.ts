import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { normalizeOffice } from "@/lib/intel/phrases";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const u = session.user;
  return u?.role === "SUPER_ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lead = await prisma.candidateLead.findUnique({
    where: { id: params.id },
    include: {
      dataSource: { select: { name: true, authorityScore: true, jurisdictionName: true } },
      newsSignals: {
        include: { article: { select: { title: true, url: true, publishedAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      profile: true,
      outreachAttempts: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

const ReviewSchema = z.object({
  action: z.enum(["verify", "reject", "merge", "set_in_review"]),
  canonicalName: z.string().optional(),
  officeNormalized: z.string().optional(),
  jurisdictionNormalized: z.string().optional(),
  wardOrRidingNormalized: z.string().optional(),
  reviewNotes: z.string().optional(),
  duplicateOfId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const user = session!.user as { id?: string };
  const { action, canonicalName, officeNormalized, jurisdictionNormalized, wardOrRidingNormalized, reviewNotes, duplicateOfId } = parsed.data;

  const lead = await prisma.candidateLead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  type LeadUpdate = {
    reviewStatus: "unreviewed" | "in_review" | "reviewed";
    reviewedByUserId: string | null;
    reviewedAt: Date;
    reviewNotes?: string | null;
    verificationStatus?: "pending" | "auto_verified" | "manually_verified" | "rejected" | "duplicate";
    canonicalName?: string | null;
    officeNormalized?: string | null;
    jurisdictionNormalized?: string | null;
    wardOrRidingNormalized?: string | null;
    duplicateOfId?: string | null;
  };

  let update: LeadUpdate = {
    reviewStatus: "reviewed",
    reviewedByUserId: user.id ?? null,
    reviewedAt: new Date(),
    reviewNotes: reviewNotes ?? null,
  };

  if (action === "verify") {
    update = {
      ...update,
      verificationStatus: "manually_verified",
      canonicalName: canonicalName ?? lead.detectedNameRaw,
      officeNormalized: officeNormalized ? normalizeOffice(officeNormalized) : lead.officeNormalized,
      jurisdictionNormalized: jurisdictionNormalized ?? lead.jurisdictionNormalized,
      wardOrRidingNormalized: wardOrRidingNormalized ?? lead.wardOrRidingNormalized,
    };

    // Auto-create profile on manual verify
    await prisma.candidateProfile.upsert({
      where: { candidateLeadId: params.id },
      update: { lastDetectedAt: new Date(), campaignStatus: "announced" },
      create: {
        candidateLeadId: params.id,
        fullName: canonicalName ?? lead.detectedNameRaw,
        office: officeNormalized ? normalizeOffice(officeNormalized) : (lead.officeNormalized ?? lead.officeRaw),
        jurisdictionRef: jurisdictionNormalized ?? lead.jurisdictionNormalized ?? lead.jurisdictionRaw,
        wardOrRiding: wardOrRidingNormalized ?? lead.wardOrRidingNormalized ?? lead.wardOrRidingRaw,
        party: lead.partyRaw,
        campaignStatus: "announced",
      },
    });
  } else if (action === "reject") {
    update = { ...update, verificationStatus: "rejected" };
  } else if (action === "merge") {
    if (!duplicateOfId) return NextResponse.json({ error: "duplicateOfId required for merge" }, { status: 400 });
    update = { ...update, verificationStatus: "duplicate", duplicateOfId };
  } else if (action === "set_in_review") {
    update = { ...update, reviewStatus: "in_review", reviewedAt: new Date() };
  }

  const updated = await prisma.candidateLead.update({ where: { id: params.id }, data: update });

  audit(prisma, `cie.lead.${action}`, {
    campaignId: "system",
    userId: user.id ?? "unknown",
    entityId: params.id,
    entityType: "CandidateLead",
    ip: req.headers.get("x-forwarded-for"),
    details: { action, name: lead.detectedNameRaw },
  });

  return NextResponse.json({ lead: updated });
}
