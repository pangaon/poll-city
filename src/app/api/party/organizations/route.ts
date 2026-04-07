import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const orgs = await prisma.partyOrganization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ridingAssociations: true, members: true } } },
  });

  return NextResponse.json({ organizations: orgs });
}

export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.name || !body.shortName || !body.level) {
    return NextResponse.json({ error: "name, shortName, and level are required" }, { status: 400 });
  }

  const org = await prisma.partyOrganization.create({
    data: {
      name: body.name,
      shortName: body.shortName,
      level: body.level,
      province: body.province ?? null,
      plan: body.plan ?? "RIDING",
      dataRetentionDays: body.dataRetentionDays ?? 365,
    },
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
