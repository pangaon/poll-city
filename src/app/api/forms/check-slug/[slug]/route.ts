import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

type Ctx = { params: { slug: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const existing = await prisma.form.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing, slug: params.slug });
}
