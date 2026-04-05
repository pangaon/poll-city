import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { parseBudgetXlsx } from "@/lib/budget/xlsx-parser";

export const dynamic = "force-dynamic";

/**
 * Smart budget import — handles real-world messy campaign finance XLSX/CSV files.
 *
 * Multipart form-data:
 *   file: File (xlsx, xls, csv, tsv)
 *   campaignId: string
 *   dryRun: "true" | "false"
 *   selectedCategories: optional JSON array of categories to import (otherwise all)
 *
 * Returns:
 *   - Dry run: { items, warnings, categoryBreakdown, spendingLimit, sheetUsed }
 *   - Execute: { imported, payments, updated spending limit, warnings }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const form = await req.formData();
  const campaignId = String(form.get("campaignId") ?? "").trim();
  const dryRun = String(form.get("dryRun") ?? "false").toLowerCase() === "true";
  const selectedRaw = form.get("selectedCategories");
  const selectedCategories = selectedRaw
    ? (JSON.parse(String(selectedRaw)) as string[])
    : null;
  const file = form.get("file");

  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // File size guard
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });
  }

  // Load campaign for election date
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { electionDate: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseBudgetXlsx(buffer, campaign?.electionDate ?? undefined);

  if (parsed.items.length === 0) {
    return NextResponse.json({
      error: "No expense items could be found in this file. Make sure column A contains expense names and column C contains amounts.",
      warnings: parsed.warnings,
      sheetUsed: parsed.sheetUsed,
      totalRows: parsed.totalRows,
    }, { status: 400 });
  }

  // Filter by selected categories if provided
  const itemsToImport = selectedCategories
    ? parsed.items.filter((item) => selectedCategories.includes(item.category))
    : parsed.items;

  // Dry run — return preview
  if (dryRun) {
    return NextResponse.json({
      data: {
        dryRun: true,
        sheetUsed: parsed.sheetUsed,
        totalRows: parsed.totalRows,
        skippedRows: parsed.skippedRows,
        parentCount: parsed.items.filter((i) => i.isParent).length,
        paymentCount: parsed.items.filter((i) => i.isPaymentDetail).length,
        categoryBreakdown: parsed.categoryBreakdown,
        spendingLimit: parsed.spendingLimit,
        partyExpenseLimit: parsed.partyExpenseLimit,
        totalAmount: parsed.items
          .filter((i) => !i.isPaymentDetail)
          .reduce((sum, i) => sum + i.amount, 0),
        warnings: parsed.warnings.slice(0, 100),
        preview: parsed.items.slice(0, 25),
        postElectionCount: parsed.items.filter((i) => i.postElection).length,
      },
    });
  }

  // Execute — import items
  const errors: Array<{ description: string; message: string }> = [];
  let imported = 0;
  let paymentsImported = 0;
  const parentMap = new Map<string, string>(); // description -> budgetItemId

  for (const item of itemsToImport) {
    if (item.isPaymentDetail) {
      const parentId = item.parentDescription ? parentMap.get(item.parentDescription) : null;
      if (parentId) {
        try {
          await prisma.budgetPayment.create({
            data: {
              budgetItemId: parentId,
              amount: item.amount,
              paymentReference: item.paymentReference,
              paidAt: item.date,
              notes: item.notes,
            },
          });
          paymentsImported++;
        } catch (e) {
          errors.push({ description: item.description, message: (e as Error).message });
        }
      }
      continue;
    }

    // Parent or standalone item
    try {
      const created = await prisma.budgetItem.create({
        data: {
          campaignId,
          itemType: "expense",
          category: item.category,
          amount: item.amount,
          description: item.description,
          receiptNumber: item.paymentReference,
          importNotes: item.notes,
          postElection: item.postElection,
          incurredAt: item.date ?? new Date(),
          paidAt: item.date,
          status: "paid",
          approvedById: session!.user.id,
        },
      });
      parentMap.set(item.description, created.id);
      imported++;
    } catch (e) {
      errors.push({ description: item.description, message: (e as Error).message });
    }
  }

  // Update campaign spending limits if parsed
  if (parsed.spendingLimit || parsed.partyExpenseLimit) {
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          ...(parsed.spendingLimit !== null && { spendingLimit: parsed.spendingLimit }),
          ...(parsed.partyExpenseLimit !== null && { partyExpenseLimit: parsed.partyExpenseLimit }),
        },
      });
    } catch (e) {
      errors.push({ description: "Spending limit update", message: (e as Error).message });
    }
  }

  // Log to ImportLog
  try {
    await prisma.importLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        filename: file.name,
        fileType: file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ? "xlsx" : "csv",
        totalRows: parsed.totalRows,
        processedRows: parsed.totalRows - parsed.skippedRows,
        importedCount: imported,
        skippedCount: parsed.skippedRows,
        errorCount: errors.length,
        status: errors.length === 0 ? "completed" : "completed_with_errors",
        warnings: parsed.warnings.slice(0, 100) as object,
        errors: errors.slice(0, 50) as object,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[budget/import-smart] log failed", e);
  }

  return NextResponse.json({
    data: {
      dryRun: false,
      imported,
      paymentsImported,
      spendingLimit: parsed.spendingLimit,
      partyExpenseLimit: parsed.partyExpenseLimit,
      sheetUsed: parsed.sheetUsed,
      warnings: parsed.warnings.slice(0, 50),
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    },
  });
}
