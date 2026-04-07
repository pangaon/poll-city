import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createPromiseSchema = z.object({
  promise: z.string().min(1, "promise is required"),
  madeAt: z.string().min(1, "madeAt is required"),
  status: z.enum(["pending", "kept", "broken", "in_progress"]).optional().default("pending"),
  evidence: z.string().nullish(),
});

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
  const parsed = createPromiseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const promise = await prisma.officialPromise.create({
    data: {
      officialId: params.officialId,
      promise: parsed.data.promise,
      madeAt: new Date(parsed.data.madeAt),
      status: parsed.data.status,
      evidence: parsed.data.evidence ?? null,
    },
  });

  return NextResponse.json({ promise }, { status: 201 });
}
