import { NextRequest } from "next/server";
import { rowsToCsv, csvResponse } from "@/lib/export/csv";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "import_export:read");
  if (permError) return permError;

  const rows = [
    {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "416-555-1234",
      address1: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 1A1",
      ward: "Ward 10",
      supportLevel: "leaning_support",
      tags: "supporter;active",
      notes: "Met at the door",
    },
  ];

  const csv = rowsToCsv(rows, [
    { key: "firstName", header: "firstName" },
    { key: "lastName", header: "lastName" },
    { key: "email", header: "email" },
    { key: "phone", header: "phone" },
    { key: "address1", header: "address1" },
    { key: "city", header: "city" },
    { key: "province", header: "province" },
    { key: "postalCode", header: "postalCode" },
    { key: "ward", header: "ward" },
    { key: "supportLevel", header: "supportLevel" },
    { key: "tags", header: "tags" },
    { key: "notes", header: "notes" },
  ]);

  return csvResponse(csv, "poll-city-import-template.csv");
}
