import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface RouteParams {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, email, question } = await request.json();

    if (!name || !email || !question) {
      return NextResponse.json({ error: "Name, email, and question are required" }, { status: 400 });
    }

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { slug: params.slug },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Create question
    const questionRecord = await prisma.question.create({
      data: {
        campaignId: campaign.id,
        name,
        email,
        question,
      },
    });

    return NextResponse.json({ success: true, questionId: questionRecord.id });
  } catch (error) {
    console.error("Question submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}