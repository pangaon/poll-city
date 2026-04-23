import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { discoverFeedsFromUrl } from "@/lib/sources/source-validator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  const baseUrl = source.canonicalUrl ?? source.baseUrl;
  if (!baseUrl) {
    return NextResponse.json({ error: "Source has no canonical URL or base URL to inspect." }, { status: 400 });
  }

  const result = await discoverFeedsFromUrl(baseUrl);
  return NextResponse.json({ result });
}
