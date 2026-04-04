/**
 * Poll City — Custom Field Service
 *
 * Handles reading and writing CustomFieldValue records.
 * Supports all field types: text, textarea, boolean, number, date, select, multiselect.
 * Used by contacts API, canvassing, import/export, filters, and stats.
 */

import prisma from "@/lib/db/prisma";
import { CampaignField, FieldType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomFieldRawValue = string | boolean | number | string[] | null;

export interface CustomFieldDisplay {
  fieldId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  options: string[];
  value: CustomFieldRawValue;
  showOnCard: boolean;
  showOnList: boolean;
  category: string;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get all custom field definitions for a campaign (cached per request)
 */
export async function getCampaignFields(campaignId: string): Promise<CampaignField[]> {
  return prisma.campaignField.findMany({
    where: { campaignId, isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

/**
 * Get all custom field values for a single contact, merged with field definitions
 */
export async function getContactCustomFields(
  contactId: string,
  campaignId: string
): Promise<CustomFieldDisplay[]> {
  const [fields, values] = await Promise.all([
    getCampaignFields(campaignId),
    prisma.customFieldValue.findMany({ where: { contactId } }),
  ]);

  return fields.map((field) => {
    const val = values.find((v) => v.fieldId === field.id);
    return {
      fieldId: field.id,
      fieldKey: field.key,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options,
      showOnCard: field.showOnCard,
      showOnList: field.showOnList,
      category: field.category,
      value: extractValue(field.fieldType, val ?? null),
    };
  });
}

/**
 * Get custom field values for many contacts at once (for table/export)
 */
export async function getBulkContactCustomFields(
  contactIds: string[],
  fields: CampaignField[]
): Promise<Record<string, Record<string, CustomFieldRawValue>>> {
  if (contactIds.length === 0 || fields.length === 0) return {};

  const values = await prisma.customFieldValue.findMany({
    where: { contactId: { in: contactIds } },
  });

  // Build map: { contactId: { fieldKey: value } }
  const result: Record<string, Record<string, CustomFieldRawValue>> = {};
  for (const contactId of contactIds) {
    result[contactId] = {};
  }

  for (const val of values) {
    const field = fields.find((f) => f.id === val.fieldId);
    if (!field) continue;
    if (!result[val.contactId]) result[val.contactId] = {};
    result[val.contactId][field.key] = extractValue(field.fieldType, val);
  }

  return result;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Set a custom field value for a contact.
 * Upserts — creates or updates the value.
 */
export async function setCustomFieldValue(
  contactId: string,
  field: CampaignField,
  rawValue: CustomFieldRawValue
): Promise<void> {
  const data = buildValueData(field.fieldType, rawValue);

  await prisma.customFieldValue.upsert({
    where: { contactId_fieldId: { contactId, fieldId: field.id } },
    create: {
      contactId,
      fieldId: field.id,
      fieldKey: field.key,
      ...data,
    },
    update: data,
  });
}

/**
 * Bulk set custom field values for a contact (from form submission or import)
 */
export async function setContactCustomFields(
  contactId: string,
  campaignId: string,
  updates: Record<string, CustomFieldRawValue>
): Promise<void> {
  const fields = await getCampaignFields(campaignId);

  await Promise.all(
    Object.entries(updates).map(async ([key, value]) => {
      const field = fields.find((f) => f.key === key);
      if (!field) return; // ignore unknown keys
      await setCustomFieldValue(contactId, field, value);
    })
  );
}

/**
 * Delete all custom field values for a contact (used on contact delete)
 */
export async function clearContactCustomFields(contactId: string): Promise<void> {
  await prisma.customFieldValue.deleteMany({ where: { contactId } });
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface CustomFieldFilter {
  fieldKey: string;
  operator: "equals" | "contains" | "is_true" | "is_false" | "includes";
  value?: string;
}

/**
 * Get contact IDs matching custom field filters.
 * Used to add custom field conditions to the contacts query.
 */
export async function getContactIdsByCustomFilters(
  campaignId: string,
  filters: CustomFieldFilter[]
): Promise<string[]> {
  if (filters.length === 0) return [];

  const fields = await getCampaignFields(campaignId);

  let contactIds: Set<string> | null = null;

  for (const filter of filters) {
    const field = fields.find((f) => f.key === filter.fieldKey);
    if (!field) continue;

    let where: Record<string, unknown> = { fieldId: field.id };

    if (field.fieldType === "boolean") {
      where.valueBool = filter.operator === "is_true";
    } else if (field.fieldType === "number") {
      where.valueNum = parseFloat(filter.value ?? "0");
    } else if (field.fieldType === "multiselect") {
      where.valueList = { has: filter.value };
    } else if (filter.operator === "contains") {
      where.valueText = { contains: filter.value, mode: "insensitive" };
    } else {
      where.valueText = filter.value;
    }

    const matching = await prisma.customFieldValue.findMany({
      where,
      select: { contactId: true },
    });

    const matchingIds = new Set(matching.map((m) => m.contactId));

    // Intersect (AND logic across filters)
    if (contactIds === null) {
      contactIds = matchingIds;
    } else {
      contactIds = new Set([...contactIds].filter((id) => matchingIds.has(id)));
    }
  }

  return contactIds ? [...contactIds] : [];
}

// ─── Stats / Reports ──────────────────────────────────────────────────────────

export interface CustomFieldStat {
  fieldKey: string;
  label: string;
  fieldType: string;
  summary: {
    trueCount?: number;
    falseCount?: number;
    valueCounts?: Record<string, number>;
    average?: number;
    total?: number;
    filled?: number;
  };
}

/**
 * Aggregate stats for all custom fields in a campaign.
 * Used in the dashboard/reports.
 */
export async function getCampaignCustomFieldStats(
  campaignId: string
): Promise<CustomFieldStat[]> {
  const fields = await prisma.campaignField.findMany({
    where: { campaignId, isVisible: true },
    orderBy: { sortOrder: "asc" },
  });

  const stats: CustomFieldStat[] = [];

  for (const field of fields) {
    const values = await prisma.customFieldValue.findMany({
      where: { fieldId: field.id },
    });

    if (values.length === 0) continue;

    let summary: CustomFieldStat["summary"] = {};

    if (field.fieldType === "boolean") {
      summary = {
        trueCount: values.filter((v) => v.valueBool === true).length,
        falseCount: values.filter((v) => v.valueBool === false).length,
      };
    } else if (field.fieldType === "number") {
      const nums = values.map((v) => v.valueNum ?? 0).filter((n) => n !== 0);
      summary = {
        average: nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
        total: nums.reduce((a, b) => a + b, 0),
        filled: nums.length,
      };
    } else if (field.fieldType === "select" || field.fieldType === "multiselect") {
      const counts: Record<string, number> = {};
      for (const v of values) {
        const vals = field.fieldType === "multiselect" ? v.valueList : [v.valueText ?? ""];
        for (const val of vals) {
          if (val) counts[val] = (counts[val] ?? 0) + 1;
        }
      }
      summary = { valueCounts: counts, filled: values.filter(v => v.valueText || v.valueList.length > 0).length };
    } else {
      summary = { filled: values.filter((v) => v.valueText).length };
    }

    stats.push({ fieldKey: field.key, label: field.label, fieldType: field.fieldType, summary });
  }

  return stats;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Get custom field CSV headers for a campaign
 */
export async function getCustomFieldCsvHeaders(
  campaignId: string
): Promise<{ key: string; label: string }[]> {
  const fields = await getCampaignFields(campaignId);
  return fields.map((f) => ({ key: f.key, label: f.label }));
}

/**
 * Format a custom field value for CSV export
 */
export function formatCustomFieldForCsv(value: CustomFieldRawValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(";");
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse a raw CSV value into the correct type for a custom field
 */
export function parseCustomFieldFromCsv(
  fieldType: FieldType,
  rawValue: string
): CustomFieldRawValue {
  if (!rawValue?.trim()) return null;
  switch (fieldType) {
    case "boolean": return ["yes", "true", "1", "y"].includes(rawValue.toLowerCase());
    case "number": return parseFloat(rawValue) ?? null;
    case "date": { const d = new Date(rawValue); return isNaN(d.getTime()) ? null : d.toISOString(); }
    case "multiselect": return rawValue.split(";").map((s) => s.trim()).filter(Boolean);
    default: return rawValue.trim();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractValue(
  fieldType: FieldType,
  val: { valueText: string | null; valueBool: boolean | null; valueNum: number | null; valueDate: Date | null; valueList: string[] } | null
): CustomFieldRawValue {
  if (!val) return null;
  switch (fieldType) {
    case "boolean": return val.valueBool;
    case "number": return val.valueNum;
    case "date": return val.valueDate?.toISOString() ?? null;
    case "multiselect": return val.valueList.length > 0 ? val.valueList : null;
    default: return val.valueText;
  }
}

function buildValueData(
  fieldType: FieldType,
  rawValue: CustomFieldRawValue
): {
  valueText?: string | null;
  valueBool?: boolean | null;
  valueNum?: number | null;
  valueDate?: Date | null;
  valueList?: string[];
} {
  switch (fieldType) {
    case "boolean":
      return { valueBool: typeof rawValue === "boolean" ? rawValue : null };
    case "number":
      return { valueNum: typeof rawValue === "number" ? rawValue : null };
    case "date":
      return { valueDate: rawValue ? new Date(rawValue as string) : null };
    case "multiselect":
      return { valueList: Array.isArray(rawValue) ? rawValue : [] };
    default:
      return { valueText: rawValue !== null ? String(rawValue) : null };
  }
}
