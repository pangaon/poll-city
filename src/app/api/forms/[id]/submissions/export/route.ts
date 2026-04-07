import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

type Ctx = { params: { id: string } };

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:export");
  if (permError) return permError;
  const campaignId = session!.user.activeCampaignId as string;

  const form = await prisma.form.findFirst({
    where: { id: params.id, campaignId },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const submissions = await prisma.formSubmission.findMany({
    where: { formId: params.id },
    orderBy: { completedAt: "desc" },
  });

  // Build CSV headers from field labels + metadata columns
  const fieldLabels = form.fields.map((f) => f.label);
  const headers = ["Submission ID", "Submitted At", "IP", "Referrer", ...fieldLabels];

  const rows = submissions.map((sub) => {
    const data = (sub.data as Record<string, any>) || {};
    const fieldValues = form.fields.map((f) => {
      const val = data[f.id] ?? data[f.label] ?? "";
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    });
    return [
      sub.id,
      sub.completedAt.toISOString(),
      sub.ip || "",
      sub.referrer || "",
      ...fieldValues,
    ];
  });

  const csvLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  const csv = csvLines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${form.slug}-submissions.csv"`,
    },
  });
}
