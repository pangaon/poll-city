"use client";

import { useEffect, useState } from "react";

export default function IntelligenceClient({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ type: "sign", title: "", details: "", lat: "", lng: "", eventDate: "" });

  async function load() {
    const res = await fetch(`/api/intelligence?campaignId=${campaignId}`);
    const data = await res.json();
    setRows(data.data ?? []);
  }

  useEffect(() => { load(); }, [campaignId]);

  async function create() {
    await fetch("/api/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        type: form.type,
        title: form.title,
        details: form.details,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        eventDate: form.eventDate || undefined,
      }),
    });
    setForm({ type: "sign", title: "", details: "", lat: "", lng: "", eventDate: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Opponent Intelligence</h1>
        <p className="text-sm text-gray-500">Track opponent signs, events, and internal notes. This data stays internal only.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <select className="border rounded-lg px-3 py-2" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
          <option value="sign">Opponent sign</option>
          <option value="event">Opponent event</option>
          <option value="media">Opponent media</option>
          <option value="note">Internal note</option>
        </select>
        <input className="border rounded-lg px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Details" value={form.details} onChange={(e) => setForm((s) => ({ ...s, details: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Latitude" value={form.lat} onChange={(e) => setForm((s) => ({ ...s, lat: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Longitude" value={form.lng} onChange={(e) => setForm((s) => ({ ...s, lng: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="date" value={form.eventDate} onChange={(e) => setForm((s) => ({ ...s, eventDate: e.target.value }))} />
        <button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit" onClick={create}>Save Intelligence</button>
      </section>

      <section className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold text-gray-900">{row.title}</p>
            <p className="text-xs text-gray-500 uppercase">{row.type}</p>
            <p className="text-sm text-gray-700 mt-2">{row.details}</p>
            {(row.lat || row.lng) && <p className="text-xs text-gray-500">Location: {row.lat}, {row.lng}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
