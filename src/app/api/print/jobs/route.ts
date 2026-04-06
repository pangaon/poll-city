import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { PrintJobStatus, PrintProductType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "signs:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const status = sp.get("status") as PrintJobStatus | null;
  const productType = sp.get("productType") as PrintProductType | null;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 20;

  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where = {
    campaignId,
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
  const permError2 = requirePermission(session!.user.role as string, "signs:write");
  if (permError2) return permError2;

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

  const { campaignId, productType, title, quantity } = body;
  if (!campaignId || !productType || !title || !quantity) {
    return NextResponse.json({ error: "campaignId, productType, title and quantity are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const job = await prisma.printJob.create({
    data: {
      campaignId,
      userId: session!.user.id,
      productType,
      title,
      quantity,
      description: body.description ?? null,
      specs: body.specs ? JSON.parse(JSON.stringify(body.specs)) : undefined,
      deadline: body.deadline ? new Date(body.deadline) : null,
      deliveryAddress: body.deliveryAddress ?? null,
      deliveryCity: body.deliveryCity ?? null,
      deliveryPostal: body.deliveryPostal ?? null,
      fileUrl: body.fileUrl ?? null,
      budgetMin: body.budgetMin ?? null,
      budgetMax: body.budgetMax ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "draft",
    },
  });

  return NextResponse.json({ data: job }, { status: 201 });
}
