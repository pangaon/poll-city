/**
 * GET /api/qr/[qrId]/scans?campaignId=xxx — paginated scan activity for a QR code
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: { qrId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  // Confirm QR belongs to this campaign
  const qrCode = await prisma.qrCode.findFirst({
    where: { id: params.qrId, campaignId },
    select: { id: true, label: true, token: true },
  });
  if (!qrCode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "25", 10));
  const skip = (page - 1) * limit;

  const [total, scans] = await Promise.all([
    prisma.qrScan.count({ where: { qrCodeId: params.qrId } }),
    prisma.qrScan.findMany({
      where: { qrCodeId: params.qrId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        intent: true,
        conversionStage: true,
        deviceClass: true,
        geoGranted: true,
        lat: true,
        lng: true,
        isRepeat: true,
        capturedName: true,
        capturedEmail: true,
        capturedPhone: true,
        capturedPostal: true,
        followUpQueued: true,
        createdAt: true,
        prospect: {
          select: { id: true, status: true, score: true },
        },
      },
    }),
  ]);

  // Mask email/phone for privacy in list view (show first 3 chars + ***)
  const maskedScans = scans.map((s) => ({
    ...s,
    capturedEmail: s.capturedEmail ? `${s.capturedEmail.slice(0, 3)}***` : null,
    capturedPhone: s.capturedPhone ? `***${s.capturedPhone.slice(-4)}` : null,
  }));

  return NextResponse.json({ scans: maskedScans, total, page, limit, qrCode });
}
