import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  // Get current campaign from session or first campaign
  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) {
    return NextResponse.json({ error: "No campaign selected" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          contacts: {
            where: { supportLevel: "strong_support" },
          },
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) {
    return NextResponse.json({ error: "No campaign selected" }, { status: 400 });
  }

  let body: {
    candidateName?: string;
    candidateTitle?: string;
    candidateBio?: string;
    primaryColor?: string;
    isPublic?: boolean;
    customDomain?: string;
    customization?: object;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(body.candidateName !== undefined && { candidateName: body.candidateName }),
      ...(body.candidateTitle !== undefined && { candidateTitle: body.candidateTitle }),
      ...(body.candidateBio !== undefined && { candidateBio: body.candidateBio }),
      ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.customDomain !== undefined && { customDomain: body.customDomain || null }),
      ...(body.customization !== undefined && { customization: body.customization as Prisma.InputJsonValue }),
    },
  });

  return NextResponse.json(campaign);
}