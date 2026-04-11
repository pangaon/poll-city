import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: { jobId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "Print job not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, job.campaignId, "billing:manage");
  if (forbidden) return forbidden;

  const updated = await prisma.printJob.update({
    where: { id: job.id },
    data: {
      paymentStatus: "released",
      status: "delivered",
    },
  });

  return NextResponse.json({ data: updated });
}
