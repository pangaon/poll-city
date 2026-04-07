import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { officialId: string } }
) {
  const promises = await prisma.officialPromise.findMany({
    where: { officialId: params.officialId },
    orderBy: { madeAt: "desc" },
    include: { _count: { select: { trackers: true } } },
  });

  return NextResponse.json({ promises });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { officialId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.promise || !body.madeAt) {
    return NextResponse.json(
      { error: "promise and madeAt are required" },
      { status: 400 }
    );
  }

  const promise = await prisma.officialPromise.create({
    data: {
      officialId: params.officialId,
      promise: body.promise,
      madeAt: new Date(body.madeAt),
      status: body.status ?? "pending",
      evidence: body.evidence ?? null,
    },
  });

  return NextResponse.json({ promise }, { status: 201 });
}
