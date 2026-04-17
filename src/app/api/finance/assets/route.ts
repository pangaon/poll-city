import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const MAGIC: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) return NextResponse.json({ error: "x-campaign-id required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const assetType = (formData.get("assetType") as string | null) ?? "receipt";

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Supported formats: JPG, PNG, WebP, PDF" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  // Magic byte check
  const header = Buffer.from(await file.slice(0, 8).arrayBuffer());
  const expected = MAGIC[file.type];
  if (expected && !expected.every((b, i) => header[i] === b)) {
    return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
  }

  try {
    const ext = file.name.split(".").pop() ?? "bin";
    const blob = await put(
      `finance-receipts/${campaignId}-${Date.now()}.${ext}`,
      file,
      { access: "public" }
    );

    const asset = await prisma.financeAsset.create({
      data: {
        campaignId,
        uploadedById: session!.user.id,
        assetType,
        fileUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json(
      { data: { id: asset.id, fileUrl: asset.fileUrl, fileName: asset.fileName } },
      { status: 201 }
    );
  } catch (e) {
    console.error("[finance/assets/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
