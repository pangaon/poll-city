import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { getChecklist, updateChecklist, markAdoniTrained } from "@/lib/help-center/store";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checklist = await getChecklist(params.slug);
  if (!checklist) return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  return NextResponse.json({ data: checklist });
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, boolean> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await updateChecklist(params.slug, body);
  if (!updated) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

  const canMarkComplete =
    updated.buildPasses &&
    updated.helpArticlePublished &&
    updated.videoRecorded &&
    updated.adoniTrained;

  if (canMarkComplete) {
    await markAdoniTrained();
  }

  return NextResponse.json({ data: updated, canMarkComplete });
}
