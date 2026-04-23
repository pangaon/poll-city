import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveQrAction } from "@/lib/qr/resolve";

export const dynamic = "force-dynamic";

// Public endpoint — resolves what action a QR should trigger for the current scanner.
// Called from the /q/[token] landing page immediately on load.
// No campaign auth required — the QR itself is the entry point.
export async function GET(
  req: NextRequest,
  { params }: { params: { qrId: string } }
) {
  const session = await getServerSession(authOptions);
  const sp = req.nextUrl.searchParams;

  const qr = await prisma.qrCode.findUnique({
    where: { id: params.qrId },
    select: {
      id: true,
      campaignId: true,
      status: true,
      type: true,
      allowAnonymous: true,
      scanCount: true,
      landingConfig: true,
      brandOverride: true,
    },
  });

  if (!qr || qr.status !== "active") {
    return NextResponse.json({ error: "QR code not found or inactive" }, { status: 404 });
  }

  const lat = sp.get("lat") ? parseFloat(sp.get("lat")!) : undefined;
  const lng = sp.get("lng") ? parseFloat(sp.get("lng")!) : undefined;
  const activeRouteId = sp.get("routeId") ?? undefined;

  let userRole: string | undefined;
  let userId: string | undefined;

  if (session?.user) {
    userId = session.user.id;
    // Determine role relative to this QR's campaign
    if (qr.campaignId) {
      const membership = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session.user.id, campaignId: qr.campaignId } },
        select: { role: true },
      });
      userRole = membership?.role ?? (session.user.role as string | undefined);
    }
  }

  const resolved = await resolveQrAction(params.qrId, {
    userId,
    userRole,
    lat,
    lng,
    activeRouteId,
    scanCount: qr.scanCount,
    currentTime: new Date(),
  });

  // Fall back to QR type default if no rule matched
  const qrTypeStr = qr.type as string;
  const defaultAction = resolved ?? {
    actionType: qrTypeStr === "donation"
      ? "donation_flow"
      : qrTypeStr === "sign"
      ? "sign_action"
      : "contact_capture",
    actionPayload: {},
  };

  return NextResponse.json({
    resolved: defaultAction,
    qr: {
      id: qr.id,
      type: qr.type,
      campaignId: qr.campaignId,
      landingConfig: qr.landingConfig,
      brandOverride: qr.brandOverride,
      isAuthenticated: !!session?.user,
    },
  });
}
