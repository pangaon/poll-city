import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { executeAction, type ActionKey } from "@/lib/operations/action-engine";
import { internalError } from "@/lib/api/errors";

const ACTION_PERMISSION_MAP: Record<ActionKey, string> = {
  "tasks.create": "tasks:write",
  "gotv.mark_voted": "gotv:write",
  "gotv.dispatch_volunteer": "gotv:write",
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null) as {
    campaignId?: string;
    action?: ActionKey;
    payload?: Record<string, unknown>;
  } | null;

  if (!body?.campaignId || !body.action) {
    return NextResponse.json({ error: "campaignId and action are required" }, { status: 400 });
  }

  const requiredPermission = ACTION_PERMISSION_MAP[body.action];
  if (!requiredPermission) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, requiredPermission);
  if (forbidden) return forbidden;

  try {
    const result = await executeAction(
      body.action,
      body.payload ?? {},
      { campaignId: body.campaignId, actorUserId: session!.user.id },
    );
    return NextResponse.json({ data: result });
  } catch (e) {
    // Check for explicit Forbidden sentinel thrown by action engine
    if (e instanceof Error && e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return internalError(e, "actions/execute");
  }
}

