import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintJobStatus } from "@prisma/client";

const VENDOR_ALLOWED_STATUSES: PrintJobStatus[] = [
  "in_production",
  "shipped",
  "delivered",
];

// Vendor updates production status, tracking info on their awarded job
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });
  if (!shop) {
    return NextResponse.json({ error: "No shop linked to this account" }, { status: 404 });
  }

  // Confirm this shop has the awarded bid on this job
  const job = await prisma.printJob.findUnique({
    where: { id: params.id },
    include: {
      bids: { where: { shopId: shop.id, isAccepted: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.bids.length === 0) {
    return NextResponse.json(
      { error: "Your shop does not have an accepted bid on this job" },
      { status: 403 }
    );
  }

  let body: {
    status?: PrintJobStatus;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !VENDOR_ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${VENDOR_ALLOWED_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.printJob.update({
    where: { id: params.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber } : {}),
      ...(body.carrier !== undefined ? { carrier: body.carrier } : {}),
      ...(body.estimatedDelivery ? { estimatedDelivery: new Date(body.estimatedDelivery) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
