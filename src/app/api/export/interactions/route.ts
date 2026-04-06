import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { exportFilename } from "@/lib/export/csv";
import { sanitizeCellValue } from "@/lib/security/xlsx-safety";

function csvCell(value: string): string {
  const safe = sanitizeCellValue(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await apiAuth(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { slug: true },
    });

    const filename = exportFilename(campaign?.slug ?? "campaign", "interactions");

    let exportedRows = 0;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode("date,type,contactName,contactAddress,canvasserName,notes,supportSignal\n")
        );

        let cursorId: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const batch = await prisma.interaction.findMany({
            where: { contact: { campaignId } },
            include: {
              contact: { select: { firstName: true, lastName: true, address1: true } },
              user: { select: { name: true, email: true } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 500,
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
          });

          if (batch.length === 0) {
            hasMore = false;
            break;
          }

          const csvRows = batch
            .map((row) => {
              const contactName = row.contact
                ? `${row.contact.firstName ?? ""} ${row.contact.lastName ?? ""}`.trim()
                : "";

              const values = [
                row.createdAt ? row.createdAt.toISOString() : "",
                row.type ?? "",
                contactName,
                row.contact?.address1 ?? "",
                row.user?.name ?? row.user?.email ?? "",
                row.notes ?? "",
                row.supportLevel ?? "",
              ];

              return values.map((value) => csvCell(String(value))).join(",");
            })
            .join("\n");

          controller.enqueue(encoder.encode(csvRows + "\n"));
          exportedRows += batch.length;

          if (batch.length < 500) {
            hasMore = false;
          } else {
            cursorId = batch[batch.length - 1]?.id;
          }
        }

        await prisma.exportLog.create({
          data: {
            campaignId,
            userId: session!.user.id,
            exportType: "interactions",
            format: "csv",
            recordCount: exportedRows,
          },
        });

        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Interactions export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
