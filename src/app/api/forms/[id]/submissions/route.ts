import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:read");
  if (permError) return permError;
  const campaignId = session!.user.activeCampaignId as string;

  const form = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const [submissions, total] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId: params.id },
      orderBy: { completedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.formSubmission.count({ where: { formId: params.id } }),
  ]);

  return NextResponse.json({
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
