/**
 * GET /api/contacts/[id]/vcard
 * Returns a .vcf (vCard 3.0) file for a contact.
 * Used by canvassers to save a contact to their phone's native contacts app.
 */

import { NextRequest, NextResponse } from "next/server";
import { mobileApiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

function escapeVcf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const contact = await prisma.contact.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      campaign: {
        memberships: { some: { userId: session!.user.id } },
      },
    },
    select: {
      firstName: true,
      lastName: true,
      nameTitle: true,
      email: true,
      phone: true,
      address1: true,
      address2: true,
      city: true,
      province: true,
      postalCode: true,
      ward: true,
      notes: true,
      campaign: { select: { name: true } },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const fullName = [contact.nameTitle, contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  const street = [contact.address1, contact.address2].filter(Boolean).join(" ");

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    foldLine(`FN:${escapeVcf(fullName)}`),
    foldLine(`N:${escapeVcf(contact.lastName ?? "")};${escapeVcf(contact.firstName ?? "")};${escapeVcf(contact.nameTitle ?? "")};;`),
  ];

  if (contact.phone) {
    lines.push(foldLine(`TEL;TYPE=CELL:${escapeVcf(contact.phone)}`));
  }
  if (contact.email) {
    lines.push(foldLine(`EMAIL;TYPE=INTERNET:${escapeVcf(contact.email)}`));
  }
  if (street || contact.city || contact.province || contact.postalCode) {
    lines.push(
      foldLine(
        `ADR;TYPE=HOME:;;${escapeVcf(street)};${escapeVcf(contact.city ?? "")};${escapeVcf(contact.province ?? "")};${escapeVcf(contact.postalCode ?? "")};Canada`,
      ),
    );
  }
  if (contact.ward) {
    lines.push(foldLine(`NOTE:Ward: ${escapeVcf(contact.ward)}${contact.notes ? `\\n${escapeVcf(contact.notes)}` : ""}`));
  } else if (contact.notes) {
    lines.push(foldLine(`NOTE:${escapeVcf(contact.notes)}`));
  }

  lines.push(foldLine(`ORG:${escapeVcf(contact.campaign.name)} — Poll City`));
  lines.push(`REV:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
  lines.push("END:VCARD");

  const vcf = lines.join("\r\n") + "\r\n";
  const fileName = `${(contact.firstName ?? "contact").toLowerCase()}-${(contact.lastName ?? "").toLowerCase()}.vcf`;

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
