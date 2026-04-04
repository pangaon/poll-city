"use client";

import { useEffect, useMemo, useState } from "react";

export default function MediaClient({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ outlet: "", mentionDate: "", url: "", sentiment: "neutral", summary: "" });

  async function load() {
    const res = await fetch(`/api/media?campaignId=${campaignId}`);
    const data = await res.json();
    setRows(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function create() {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setForm({ outlet: "", mentionDate: "", url: "", sentiment: "neutral", summary: "" });
    load();
  }

  const summary = useMemo(() => ({
    total: rows.length,
    positive: rows.filter((r) => r.sentiment === "positive").length,
    neutral: rows.filter((r) => r.sentiment === "neutral").length,
    negative: rows.filter((r) => r.sentiment === "negative").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Media Tracking</h1>
        <p className="text-sm text-gray-500">Track press mentions and sentiment over time.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Total mentions" value={summary.total} />
        <Stat label="Positive" value={summary.positive} />
        <Stat label="Neutral" value={summary.neutral} />
        <Stat label="Negative" value={summary.negative} />
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Outlet name" value={form.outlet} onChange={(e) => setForm((s) => ({ ...s, outlet: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="date" value={form.mentionDate} onChange={(e) => setForm((s) => ({ ...s, mentionDate: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="URL" value={form.url} onChange={(e) => setForm((s) => ({ ...s, url: e.target.value }))} />
        <select className="border rounded-lg px-3 py-2" value={form.sentiment} onChange={(e) => setForm((s) => ({ ...s, sentiment: e.target.value }))}>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Summary" value={form.summary} onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))} />
        <button onClick={create} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit">Log Mention</button>
      </section>

      <section className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold text-gray-900">{row.outlet}</p>
            <p className="text-xs text-gray-500">{new Date(row.mentionDate).toLocaleDateString()} · {row.sentiment}</p>
            {row.url && <a className="text-sm text-blue-700" href={row.url} target="_blank" rel="noreferrer">{row.url}</a>}
            <p className="text-sm text-gray-700 mt-2">{row.summary}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
