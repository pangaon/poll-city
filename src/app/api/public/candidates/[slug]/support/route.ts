import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface RouteParams {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, email, householdCount } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: params.slug },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Find existing contact or create new
    let contact = await prisma.contact.findFirst({
      where: {
        campaignId: campaign.id,
        email,
      },
    });

    if (contact) {
      // Update existing contact
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          supportLevel: "strong_support",
          notes: `Household size: ${householdCount}`,
        },
      });
    } else {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          campaignId: campaign.id,
          firstName: name.split(" ")[0] || "",
          lastName: name.split(" ").slice(1).join(" ") || "",
          email,
          supportLevel: "strong_support",
          notes: `Household size: ${householdCount}`,
        },
      });
    }

    return NextResponse.json({ success: true, contactId: contact.id });
  } catch (error) {
    console.error("Support submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}