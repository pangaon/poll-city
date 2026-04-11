import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { PrintJobStatus, PrintProductType } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const status = sp.get("status") as PrintJobStatus | null;
  const productType = sp.get("productType") as PrintProductType | null;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 20;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "signs:read");
  if (forbidden) return forbidden;

  const where = {
    campaignId: campaignId!,
    ...(status ? { status } : {}),
    ...(productType ? { productType } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.printJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { bids: true } },
      },
    }),
    prisma.printJob.count({ where }),
  ]);

  return NextResponse.json({ data: jobs, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: {
    campaignId: string;
    productType: PrintProductType;
    title: string;
    quantity: number;
    description?: string;
    specs?: Record<string, unknown>;
    deadline?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryPostal?: string;
    fileUrl?: string;
    budgetMin?: number;
    budgetMax?: number;
    notes?: string;
    status?: PrintJobStatus;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId: postCampaignId, productType, title, quantity } = body;
  if (!productType || !title || !quantity) {
    return NextResponse.json({ error: "campaignId, productType, title and quantity are required" }, { status: 400 });
  }

  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, postCampaignId, "signs:write");
  if (forbidden2) return forbidden2;
  const campaignId2 = postCampaignId;

  const job = await prisma.printJob.create({
    data: {
      campaignId: campaignId2,
      userId: session!.user.id,
      productType,
      title,
      quantity,
      description: sanitizeUserText(body.description),
      specs: body.specs ? JSON.parse(JSON.stringify(body.specs)) : undefined,
      deadline: body.deadline ? new Date(body.deadline) : null,
      deliveryAddress: body.deliveryAddress ?? null,
      deliveryCity: body.deliveryCity ?? null,
      deliveryPostal: body.deliveryPostal ?? null,
      fileUrl: body.fileUrl ?? null,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      notes: sanitizeUserText(body.notes),
      status: body.status ?? "draft",
    },
  });

  return NextResponse.json({ data: job }, { status: 201 });
}
