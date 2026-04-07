import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { markAdoniTrained, getAdoniTrainState } from "@/lib/help-center/store";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const state = await markAdoniTrained();
  return NextResponse.json({ ok: true, state });
}

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;
  return NextResponse.json({ ok: true, state: getAdoniTrainState() });
}
