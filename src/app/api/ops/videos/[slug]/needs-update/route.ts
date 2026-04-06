import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { markVideoNeedsUpdate } from "@/lib/help-center/store";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await markVideoNeedsUpdate(params.slug);
  if (!updated) return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
