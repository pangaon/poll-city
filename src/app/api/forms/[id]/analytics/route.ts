import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

type Ctx = { params: { id: string } };

const OPTION_TYPES = new Set(["radio", "select", "checkboxes", "checkbox_group"]);
const NUMBER_TYPES = new Set(["number", "rating", "scale"]);
const BOOLEAN_TYPES = new Set(["checkbox"]);

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:read");
  if (forbidden) return forbidden;

  const form = await prisma.form.findFirst({
    where: { id: params.id, campaignId },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const submissions = await prisma.formSubmission.findMany({
    where: { formId: params.id },
    select: { data: true, completedAt: true },
    orderBy: { completedAt: "asc" },
  });

  const total = submissions.length;

  // Per-field aggregation
  type FieldStat = {
    fieldId: string;
    label: string;
    type: string;
    answered: number;
    distribution?: { label: string; count: number }[];
    average?: number;
    min?: number;
    max?: number;
    topValues?: { value: string; count: number }[];
  };

  const fieldStats: FieldStat[] = [];

  for (const field of form.fields) {
    if (["heading", "paragraph", "divider", "image"].includes(field.type)) continue;

    const values: unknown[] = [];
    for (const sub of submissions) {
      const data = sub.data as Record<string, unknown>;
      const v = data[field.id];
      if (v !== undefined && v !== null && v !== "") values.push(v);
    }

    const stat: FieldStat = { fieldId: field.id, label: field.label, type: field.type, answered: values.length };

    if (OPTION_TYPES.has(field.type)) {
      const freq: Record<string, number> = {};
      const opts = Array.isArray(field.options) ? (field.options as string[]) : [];
      for (const o of opts) freq[o] = 0;
      for (const v of values) {
        if (Array.isArray(v)) {
          for (const item of v) if (typeof item === "string") freq[item] = (freq[item] ?? 0) + 1;
        } else if (typeof v === "string") {
          freq[v] = (freq[v] ?? 0) + 1;
        }
      }
      stat.distribution = Object.entries(freq)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    } else if (BOOLEAN_TYPES.has(field.type)) {
      let yes = 0;
      let no = 0;
      for (const v of values) {
        if (v === true || v === "true" || v === "yes") yes++;
        else no++;
      }
      stat.distribution = [
        { label: "Yes", count: yes },
        { label: "No", count: no },
      ];
    } else if (NUMBER_TYPES.has(field.type)) {
      const nums = values.filter((v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)))).map(Number);
      if (nums.length > 0) {
        stat.average = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
        stat.min = Math.min(...nums);
        stat.max = Math.max(...nums);

        // Distribution into buckets for rating (1–5 or 1–10) or small integer ranges
        const isRating = field.type === "rating" || (stat.max !== undefined && stat.max <= 10 && stat.min !== undefined && stat.min >= 1);
        if (isRating && stat.max !== undefined && stat.min !== undefined) {
          const freq: Record<number, number> = {};
          for (let i = stat.min; i <= stat.max; i++) freq[i] = 0;
          for (const n of nums) freq[n] = (freq[n] ?? 0) + 1;
          stat.distribution = Object.entries(freq).map(([label, count]) => ({ label, count }));
        }
      }
    } else {
      // text, textarea, email, phone — top values
      const freq: Record<string, number> = {};
      for (const v of values) {
        if (typeof v === "string" && v.trim()) {
          const key = v.trim().toLowerCase().slice(0, 60);
          freq[key] = (freq[key] ?? 0) + 1;
        }
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      if (sorted.some(([, c]) => c > 1)) {
        stat.topValues = sorted.slice(0, 10).map(([value, count]) => ({ value, count }));
      }
    }

    fieldStats.push(stat);
  }

  // Daily submission trend (last 30 days)
  const trend: { date: string; count: number }[] = [];
  const byDay: Record<string, number> = {};
  for (const sub of submissions) {
    const d = sub.completedAt.toISOString().slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + 1;
  }
  const days = Object.keys(byDay).sort();
  for (const d of days) trend.push({ date: d, count: byDay[d] });

  return NextResponse.json({
    form: {
      id: form.id,
      name: form.name,
      viewCount: form.viewCount,
      submissionCount: form.submissionCount ?? total,
    },
    total,
    fieldStats,
    trend,
  });
}
