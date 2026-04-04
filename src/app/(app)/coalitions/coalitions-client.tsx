"use client";

import { useEffect, useState } from "react";

export default function CoalitionsClient({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ organizationName: "", contactName: "", contactEmail: "", memberCount: 0, endorsementDate: "", isPublic: false, logoUrl: "" });

  async function load() {
    const res = await fetch(`/api/coalitions?campaignId=${campaignId}`);
    const data = await res.json();
    setRows(data.data ?? []);
  }

  useEffect(() => { load(); }, [campaignId]);

  async function create() {
    await fetch("/api/coalitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setForm({ organizationName: "", contactName: "", contactEmail: "", memberCount: 0, endorsementDate: "", isPublic: false, logoUrl: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Coalition Management</h1>
        <p className="text-sm text-gray-500">Track endorsing organizations and manage public/private coalition visibility.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Organization name" value={form.organizationName} onChange={(e) => setForm((s) => ({ ...s, organizationName: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Contact" value={form.contactName} onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Contact email" value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Member count" value={form.memberCount} onChange={(e) => setForm((s) => ({ ...s, memberCount: Number(e.target.value) }))} />
        <input className="border rounded-lg px-3 py-2" type="date" value={form.endorsementDate} onChange={(e) => setForm((s) => ({ ...s, endorsementDate: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Logo URL" value={form.logoUrl} onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((s) => ({ ...s, isPublic: e.target.checked }))} />Public on candidate page</label>
        <button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit" onClick={create}>Save Coalition</button>
      </section>

      <section className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold text-gray-900">{row.organizationName}</p>
            <p className="text-sm text-gray-500">{row.contactName || "No contact"} · {row.contactEmail || "No email"}</p>
            <p className="text-xs text-gray-500">Members: {row.memberCount ?? "N/A"} · {row.endorsementDate ? new Date(row.endorsementDate).toLocaleDateString() : "No endorsement date"} · {row.isPublic ? "Public" : "Private"}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
