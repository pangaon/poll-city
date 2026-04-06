import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { validateDebugAccess } from "@/lib/debug/access";

const screenshotSchema = z.object({
  data: z.string().min(1),
});

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const raw = await req.json().catch(() => null);
  const parsed = screenshotSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const dataUrl = parsed.data.data;
  const [meta, base64Part] = dataUrl.split(",");
  const mimeMatch = meta?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
  if (!mimeMatch || !base64Part) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }

  const mimeType = mimeMatch[1];
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(base64Part, "base64");
  if (buffer.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Screenshot exceeds 12MB limit" }, { status: 413 });
  }

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const blob = await put(`debug/${access.userId}/screenshots/${Date.now()}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: true,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
