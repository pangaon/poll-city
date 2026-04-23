import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { z } from "zod";
import { listPacks, createPack } from "@/lib/sources/source-service";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const packs = await listPacks({
    municipality: p.get("municipality") || undefined,
    packType: p.get("packType") || undefined,
    isActive: p.get("isActive") === "false" ? false : true,
    search: p.get("search") || undefined,
  });

  return NextResponse.json({ packs });
}

const CreatePackSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  visibility: z.string().default("global"),
  municipality: z.string().optional(),
  geographyScope: z.string().optional(),
  officeScope: z.string().optional(),
  packType: z.enum(["municipality", "ward", "office", "local_media", "opponent_watch", "municipal_news", "community_watch", "issue_watch", "compliance"]),
  isRecommended: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const userId = (session!.user as { id?: string }).id ?? "unknown";

  try {
    const pack = await createPack({ ...parsed.data, createdByUserId: userId });
    return NextResponse.json({ pack }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create pack";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
