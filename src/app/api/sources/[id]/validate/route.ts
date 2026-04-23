import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { validateSourceUrl } from "@/lib/sources/source-validator";
import { recordHealthCheck } from "@/lib/sources/source-service";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await prisma.platformSource.findUnique({ where: { id: params.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const urlToCheck = source.feedUrl ?? source.canonicalUrl ?? source.baseUrl;
  if (!urlToCheck) {
    return NextResponse.json({ error: "Source has no URL to validate." }, { status: 400 });
  }

  const result = await validateSourceUrl(urlToCheck);

  // Record as a health check
  await recordHealthCheck(source.id, {
    httpStatus: result.httpStatus,
    latencyMs: result.latencyMs,
    isReachable: result.isReachable,
    isFeedValid: result.isFeedValid,
    isContentFresh: result.isContentFresh,
    parserSuccess: result.isFeedValid,
    itemsFound: result.itemsFound,
    errorMessage: result.errors.join("; ") || undefined,
    validationNotes: [...result.errors, ...result.suggestions].join("; ") || undefined,
  });

  // Auto-update verification status based on result
  if (result.isReachable && result.isFeedValid) {
    await prisma.platformSource.update({
      where: { id: source.id },
      data: { verificationStatus: "verified" },
    });
  } else if (!result.isReachable) {
    await prisma.platformSource.update({
      where: { id: source.id },
      data: { verificationStatus: "needs_review" },
    });
  }

  return NextResponse.json({ result });
}
