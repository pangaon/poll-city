/**
 * Household grouper — called after each import chunk to link newly created
 * contacts into Household records based on shared address.
 *
 * This is a best-effort operation. It never fails the parent import.
 * Run-bounded: only processes the contactIds passed in, so it stays within
 * the cron's time budget even on large voter files.
 */

import type { PrismaClient } from "@prisma/client";

interface ContactAddress {
  id: string;
  address1: string | null;
  unitApt: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  ward: string | null;
  riding: string | null;
}

function buildAddressKey(c: ContactAddress): string | null {
  const postal = c.postalCode?.replace(/\s/g, "").toUpperCase();
  if (!postal) return null;
  const addr = c.address1?.trim().toLowerCase();
  if (!addr) return null;
  const unit = c.unitApt?.trim().toLowerCase() ?? "";
  return `${addr}|${unit}|${postal}`;
}

/**
 * Groups a batch of newly imported contacts into Household records.
 * Safe to call on every chunk — re-uses existing households at the same address.
 */
export async function groupHouseholdsForContacts(
  campaignId: string,
  contactIds: string[],
  prisma: PrismaClient,
): Promise<void> {
  if (contactIds.length === 0) return;

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, campaignId, householdId: null, deletedAt: null },
    select: {
      id: true,
      address1: true,
      unitApt: true,
      postalCode: true,
      city: true,
      province: true,
      ward: true,
      riding: true,
    },
  });

  const groups = new Map<string, ContactAddress[]>();
  for (const c of contacts) {
    const key = buildAddressKey(c);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(c);
    groups.set(key, group);
  }

  if (groups.size === 0) return;

  // Load existing households once to avoid duplicate creation on re-imports
  const existing = await prisma.household.findMany({
    where: { campaignId },
    select: { id: true, address1: true, address2: true, postalCode: true },
  });
  const existingMap = new Map<string, string>();
  for (const h of existing) {
    if (!h.address1) continue;
    const key = `${h.address1.trim().toLowerCase()}|${(h.address2 ?? "").trim().toLowerCase()}|${h.postalCode?.replace(/\s/g, "").toUpperCase() ?? ""}`;
    existingMap.set(key, h.id);
  }

  for (const [key, members] of Array.from(groups.entries())) {
    let householdId = existingMap.get(key);

    if (!householdId) {
      const rep = members[0];
      const created = await prisma.household.create({
        data: {
          campaignId,
          address1: rep.address1 ?? "Unknown",
          address2: rep.unitApt || null,
          city: rep.city || null,
          province: rep.province || null,
          postalCode: rep.postalCode || null,
          ward: rep.ward || null,
          riding: rep.riding || null,
          totalVoters: members.length,
        },
        select: { id: true },
      });
      householdId = created.id;
      existingMap.set(key, householdId);
    }

    await prisma.contact.updateMany({
      where: { id: { in: members.map((m) => m.id) } },
      data: { householdId },
    });
  }
}
