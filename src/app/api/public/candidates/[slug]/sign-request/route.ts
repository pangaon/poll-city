import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface RouteParams {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { address, name, email } = await request.json();

    if (!address || !name || !email) {
      return NextResponse.json({ error: "Address, name, and email are required" }, { status: 400 });
    }

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: params.slug },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Create sign request
    const signRequest = await prisma.signRequest.create({
      data: {
        campaignId: campaign.id,
        address,
        name,
        email,
      },
    });

    return NextResponse.json({ success: true, signRequestId: signRequest.id });
  } catch (error) {
    console.error("Sign request submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}