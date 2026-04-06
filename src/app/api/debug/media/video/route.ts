import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { validateDebugAccess } from "@/lib/debug/access";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const form = await req.formData();
  const video = form.get("video");
  if (!(video instanceof File)) {
    return NextResponse.json({ error: "Video is required" }, { status: 400 });
  }

  if (video.size > MAX_VIDEO_SIZE) {
    return NextResponse.json({ error: "Video exceeds 50MB limit" }, { status: 413 });
  }

  if (!video.type.includes("webm")) {
    return NextResponse.json({ error: "Only webm videos are supported" }, { status: 400 });
  }

  const blob = await put(`debug/${access.userId}/videos/${Date.now()}-${video.name || "recording.webm"}`, video, {
    access: "public",
    contentType: video.type,
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
