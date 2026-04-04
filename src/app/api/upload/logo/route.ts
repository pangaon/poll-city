import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { put } from "@vercel/blob";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) {
    return NextResponse.json({ error: "No campaign selected" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`campaign-logos/${campaignId}-${Date.now()}.${file.name.split('.').pop()}`, file, {
      access: "public",
    });

    // Update campaign with new logo URL
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { logoUrl: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}