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
    const uploadType = (formData.get("uploadType") as string | null) ?? "logo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (uploadType === "logo") {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
      }
    } else if (uploadType === "print") {
      const allowed = [
        "application/pdf",
        "application/postscript",
        "application/illustrator",
        "image/png",
        "image/jpeg",
        "image/tiff",
      ];
      if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith(".ai")) {
        return NextResponse.json({ error: "Supported print formats: PDF, AI, PNG, JPG, TIFF" }, { status: 400 });
      }
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "Print files must be under 25MB" }, { status: 400 });
      }
    }

    // Upload to Vercel Blob
    const folder = uploadType === "print" ? "print-files" : "campaign-logos";
    const blob = await put(`${folder}/${campaignId}-${Date.now()}.${file.name.split('.').pop()}`, file, {
      access: "public",
    });

    if (uploadType === "logo") {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { logoUrl: blob.url },
      });
    }

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}