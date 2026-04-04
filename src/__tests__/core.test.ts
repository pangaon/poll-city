/**
 * Poll City — Critical Path Tests
 * Run: npm test
 */

import { createContactSchema, createInteractionSchema, createTaskSchema, loginSchema } from "../lib/validators";
import { slugify, fullName, formatPhone, toCSV, parsePagination } from "../lib/utils";
import { SupportLevel, InteractionType, TaskPriority } from "@prisma/client";

// ─── Validator Tests ────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "admin@pollcity.dev", password: "password123" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "password123" });
    expect(result.success).toBe(false);
  });
  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@pollcity.dev", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("createContactSchema", () => {
  const base = {
    campaignId: "cltest0000000000000000000",
    firstName: "Jane",
    lastName: "Smith",
  };

  it("accepts minimal valid contact", () => {
    expect(createContactSchema.safeParse(base).success).toBe(true);
  });

  it("accepts full valid contact", () => {
    const result = createContactSchema.safeParse({
      ...base,
      email: "jane@example.com",
      phone: "416-555-0100",
      address1: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M4C 1A1",
      ward: "Ward 12",
      supportLevel: SupportLevel.strong_support,
      issues: ["Transit", "Housing"],
      signRequested: true,
      volunteerInterest: false,
      doNotContact: false,
      followUpNeeded: true,
      notes: "Met at the door",
      preferredLanguage: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty firstName", () => {
    expect(createContactSchema.safeParse({ ...base, firstName: "" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(createContactSchema.safeParse({ ...base, email: "notvalid" }).success).toBe(false);
  });

  it("accepts empty string email (optional)", () => {
    expect(createContactSchema.safeParse({ ...base, email: "" }).success).toBe(true);
  });

  it("rejects invalid campaignId", () => {
    expect(createContactSchema.safeParse({ ...base, campaignId: "not-a-cuid" }).success).toBe(false);
  });
});

describe("createInteractionSchema", () => {
  const base = {
    contactId: "cltest0000000000000000000",
    type: InteractionType.door_knock,
  };

  it("accepts minimal interaction", () => {
    expect(createInteractionSchema.safeParse(base).success).toBe(true);
  });

  it("accepts full interaction", () => {
    const result = createInteractionSchema.safeParse({
      ...base,
      notes: "Spoke to voter at door",
      supportLevel: SupportLevel.leaning_support,
      issues: ["Transit"],
      signRequested: true,
      volunteerInterest: false,
      followUpNeeded: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid interaction type", () => {
    expect(createInteractionSchema.safeParse({ ...base, type: "smoke_signal" }).success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  const base = {
    campaignId: "cltest0000000000000000000",
    createdById: "cltest0000000000000000001",
    title: "Follow up with Jane",
  };

  it("accepts valid task", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });

  it("rejects title too short", () => {
    expect(createTaskSchema.safeParse({ ...base, title: "Hi" }).success).toBe(false);
  });

  it("accepts task with valid priority", () => {
    expect(createTaskSchema.safeParse({ ...base, priority: TaskPriority.urgent }).success).toBe(true);
  });
});

// ─── Utility Tests ──────────────────────────────────────────────────────────

describe("slugify", () => {
  it("converts to lowercase with hyphens", () => {
    expect(slugify("Ward 12 — City Council 2026")).toBe("ward-12--city-council-2026");
  });
  it("strips special characters", () => {
    expect(slugify("Campaign! #1")).toBe("campaign-1");
  });
  it("handles already-clean slugs", () => {
    expect(slugify("my-campaign")).toBe("my-campaign");
  });
});

describe("fullName", () => {
  it("combines first and last name", () => {
    expect(fullName("Jane", "Smith")).toBe("Jane Smith");
  });
  it("handles null values", () => {
    expect(fullName(null, "Smith")).toBe("Smith");
    expect(fullName("Jane", null)).toBe("Jane");
    expect(fullName(null, null)).toBe("Unknown");
  });
  it("handles empty strings", () => {
    expect(fullName("", "")).toBe("Unknown");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit phone", () => {
    expect(formatPhone("4165550100")).toBe("(416) 555-0100");
  });
  it("returns formatted phone as-is if already formatted", () => {
    expect(formatPhone("416-555-0100")).toBe("416-555-0100");
  });
  it("handles null", () => {
    expect(formatPhone(null)).toBe("—");
  });
  it("handles undefined", () => {
    expect(formatPhone(undefined)).toBe("—");
  });
});

describe("toCSV", () => {
  it("generates correct CSV header and rows", () => {
    const data = [{ name: "Jane Smith", email: "jane@example.com" }];
    const headers = [{ key: "name" as const, label: "Name" }, { key: "email" as const, label: "Email" }];
    const csv = toCSV(data, headers);
    expect(csv).toContain('"Name","Email"');
    expect(csv).toContain('"Jane Smith","jane@example.com"');
  });

  it("escapes double quotes in fields", () => {
    const data = [{ name: 'He said "hello"', email: "" }];
    const headers = [{ key: "name" as const, label: "Name" }, { key: "email" as const, label: "Email" }];
    const csv = toCSV(data, headers);
    expect(csv).toContain('He said ""hello""');
  });

  it("handles null/undefined values", () => {
    const data = [{ name: null as unknown as string, email: undefined as unknown as string }];
    const headers = [{ key: "name" as const, label: "Name" }, { key: "email" as const, label: "Email" }];
    const csv = toCSV(data, headers);
    expect(csv).toContain('""');
  });
});

describe("parsePagination", () => {
  it("defaults to page 1, size 25", () => {
    const params = new URLSearchParams();
    expect(parsePagination(params)).toEqual({ page: 1, pageSize: 25, skip: 0 });
  });

  it("parses page and pageSize", () => {
    const params = new URLSearchParams({ page: "3", pageSize: "10" });
    expect(parsePagination(params)).toEqual({ page: 3, pageSize: 10, skip: 20 });
  });

  it("clamps pageSize to max 100", () => {
    const params = new URLSearchParams({ pageSize: "9999" });
    expect(parsePagination(params).pageSize).toBe(100);
  });

  it("clamps page to min 1", () => {
    const params = new URLSearchParams({ page: "-5" });
    expect(parsePagination(params).page).toBe(1);
  });
});
