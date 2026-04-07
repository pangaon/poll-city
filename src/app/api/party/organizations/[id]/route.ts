import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const org = await prisma.partyOrganization.findUnique({
    where: { id: params.id },
    include: {
      ridingAssociations: true,
      _count: { select: { members: true, agms: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ organization: org });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  const org = await prisma.partyOrganization.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.shortName !== undefined && { shortName: body.shortName }),
      ...(body.level !== undefined && { level: body.level }),
      ...(body.province !== undefined && { province: body.province }),
      ...(body.plan !== undefined && { plan: body.plan }),
      ...(body.dataRetentionDays !== undefined && { dataRetentionDays: body.dataRetentionDays }),
    },
  });

  return NextResponse.json({ organization: org });
}
