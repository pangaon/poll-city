import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1, "name is required"),
  shortName: z.string().min(1, "shortName is required"),
  level: z.string().min(1, "level is required"),
  province: z.string().nullish(),
  plan: z.string().optional().default("RIDING"),
  dataRetentionDays: z.number().int().positive().optional().default(365),
});

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
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.partyOrganization.create({
    data: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      level: parsed.data.level,
      province: parsed.data.province ?? null,
      plan: parsed.data.plan,
      dataRetentionDays: parsed.data.dataRetentionDays,
    },
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
