"use client";

import { useEffect, useState } from "react";
import { VerificationChecklist } from "@/components/ops/verification-checklist";
import { toast } from "sonner";

type Row = {
  slug: string;
  feature: string;
  status: string;
};

type Checklist = {
  apiRouteExists: boolean;
  buildPasses: boolean;
  noTypeScriptErrors: boolean;
  emptyStateExists: boolean;
  loadingStateExists: boolean;
  errorStateExists: boolean;
  mobileWorks: boolean;
  dataIsReal: boolean;
  securityApplied: boolean;
  auditLogExists: boolean;
  helpArticlePublished: boolean;
  videoRecorded: boolean;
  adoniTrained: boolean;
};

export default function OpsVerifyPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [checklist, setChecklist] = useState<Checklist | null>(null);

  async function loadRows() {
    const res = await fetch("/api/ops/videos");
    const data = await res.json();
    const list = (data.data || []) as Row[];
    setRows(list);
    if (!selectedSlug && list[0]) setSelectedSlug(list[0].slug);
  }

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    fetch(`/api/ops/verify/${selectedSlug}`)
      .then((res) => res.json())
      .then((data) => setChecklist(data.data || null));
  }, [selectedSlug]);

  async function pushChecklist(next: Checklist) {
    if (!selectedSlug) return;
    setChecklist(next);
    await fetch(`/api/ops/verify/${selectedSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function markComplete() {
    if (!selectedSlug || !checklist) return;
    const res = await fetch(`/api/ops/verify/${selectedSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checklist),
    });
    const data = await res.json();
    if (data.canMarkComplete) {
      await fetch("/api/adoni/train", { method: "POST" });
      toast.success("Feature marked complete ✅");
      const idx = rows.findIndex((row) => row.slug === selectedSlug);
      if (idx >= 0 && rows[idx + 1]) setSelectedSlug(rows[idx + 1].slug);
    } else {
      toast.error("Video required before marking complete");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Verify Features</h1>
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-2 max-h-[70vh] overflow-auto">
          {rows.map((row) => (
            <button
              key={row.slug}
              type="button"
              onClick={() => setSelectedSlug(row.slug)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selectedSlug === row.slug ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50"}`}
            >
              <p className="font-semibold">{row.feature}</p>
              <p className="text-xs text-slate-500">{row.status}</p>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {checklist ? (
            <VerificationChecklist
              checklist={checklist}
              onToggle={(key, value) => pushChecklist({ ...checklist, [key]: value })}
              onMarkComplete={markComplete}
            />
          ) : (
            <p className="text-sm text-slate-600">Select a feature to verify.</p>
          )}
        </div>
      </div>
    </div>
  );
}
