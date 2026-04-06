import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:read");
  if (permError) return permError;
  const campaignId = (session!.user as any).activeCampaignId as string;

  const forms = await prisma.form.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true, fields: true } } },
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:write");
  if (permError) return permError;
  const campaignId = (session!.user as any).activeCampaignId as string;

  try {
    const body = await req.json();
    const { name, title, description } = body;

    if (!name || !title) {
      return NextResponse.json({ error: "name and title are required" }, { status: 400 });
    }

    let slug = body.slug ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") : slugify(name);

    if (!slug) {
      return NextResponse.json({ error: "Could not generate a valid slug" }, { status: 400 });
    }

    // Ensure uniqueness
    const existing = await prisma.form.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const form = await prisma.form.create({
      data: {
        campaignId,
        name,
        slug,
        title,
        description: description || null,
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/forms]", err);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}
