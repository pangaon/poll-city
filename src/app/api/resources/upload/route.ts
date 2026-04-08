/**
 * POST /api/resources/upload
 * Upload a resource file. Stores metadata in campaign customization JSON.
 * File content stored as base64 data URL for small files (<5MB).
 * For production at scale, migrate to S3/R2/Vercel Blob.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const campaignId = formData.get("campaignId") as string | null;
    const title = (formData.get("title") as string | null)?.trim();
    const category = (formData.get("category") as string | null) || "general";

    if (!file || !campaignId) {
      return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    }

    // Verify membership
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Read file as base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Store in campaign customization
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { customization: true },
    });

    const custom = (campaign?.customization ?? {}) as Record<string, unknown>;
    const resources = (custom.uploadedResources ?? []) as Array<Record<string, unknown>>;

    const newResource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title || file.name,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      category,
      dataUrl,
      uploadedBy: session!.user.name || session!.user.email,
      uploadedAt: new Date().toISOString(),
    };

    resources.push(newResource);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { customization: { ...custom, uploadedResources: resources } as object },
    });

    return NextResponse.json({
      ok: true,
      resource: { id: newResource.id, title: newResource.title, filename: newResource.filename, category: newResource.category },
    });
  } catch (err) {
    console.error("Resource upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customization: true },
  });

  const custom = (campaign?.customization ?? {}) as Record<string, unknown>;
  const resources = (custom.uploadedResources ?? []) as Array<Record<string, unknown>>;

  // Return without the base64 data (too large for list view)
  const list = resources.map((r) => ({
    id: r.id,
    title: r.title,
    filename: r.filename,
    mimeType: r.mimeType,
    size: r.size,
    category: r.category,
    uploadedBy: r.uploadedBy,
    uploadedAt: r.uploadedAt,
  }));

  return NextResponse.json({ data: list });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const resourceId = req.nextUrl.searchParams.get("id");
  if (!campaignId || !resourceId) return NextResponse.json({ error: "campaignId and id required" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customization: true },
  });

  const custom = (campaign?.customization ?? {}) as Record<string, unknown>;
  const resources = (custom.uploadedResources ?? []) as Array<Record<string, unknown>>;
  const filtered = resources.filter((r) => r.id !== resourceId);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { customization: { ...custom, uploadedResources: filtered } as object },
  });

  return NextResponse.json({ ok: true });
}
