import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { updateVideo } from "@/lib/help-center/store";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    videoUrl?: string;
    thumbnailUrl?: string;
    minutes?: number;
    seconds?: number;
    clearVideo?: boolean;
    confirms?: { e2e?: boolean; accurate?: boolean; build?: boolean };
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.clearVideo && !body.videoUrl?.trim()) {
    return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
  }

  if (!body.clearVideo && (!body.confirms?.e2e || !body.confirms?.accurate || !body.confirms?.build)) {
    return NextResponse.json({ error: "All verification confirmations are required" }, { status: 400 });
  }

  const duration = `${Math.max(0, Number(body.minutes || 0))}:${String(Math.max(0, Number(body.seconds || 0))).padStart(2, "0")}`;
  const updated = await updateVideo(params.slug, {
    videoUrl: body.clearVideo ? null : body.videoUrl!.trim(),
    thumbnailUrl: body.clearVideo ? null : body.thumbnailUrl?.trim() || null,
    duration: body.clearVideo ? null : duration,
    verifiedBy: body.clearVideo ? null : session!.user.email || session!.user.name || "admin",
  });

  if (!updated) return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
