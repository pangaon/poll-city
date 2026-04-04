"use client";

import { useEffect, useState } from "react";

export default function VolunteerExpensesClient({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState({ volunteerProfileId: "", amount: 0, category: "", receiptUrl: "", notes: "" });

  async function load() {
    const [expensesRes, profilesRes] = await Promise.all([
      fetch(`/api/volunteers/expenses?campaignId=${campaignId}`),
      fetch(`/api/volunteers?campaignId=${campaignId}&pageSize=200`),
    ]);
    const expensesData = await expensesRes.json();
    const profilesData = await profilesRes.json();
    setRows(expensesData.data ?? []);
    setProfiles(profilesData.data ?? []);
  }

  useEffect(() => { load(); }, [campaignId]);

  async function create() {
    await fetch("/api/volunteers/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setForm({ volunteerProfileId: "", amount: 0, category: "", receiptUrl: "", notes: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Volunteer Expenses</h1>
        <p className="text-sm text-gray-500">Submit, review, and export volunteer reimbursements.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <select className="border rounded-lg px-3 py-2" value={form.volunteerProfileId} onChange={(e) => setForm((s) => ({ ...s, volunteerProfileId: e.target.value }))}>
          <option value="">Select volunteer</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{(p.user?.name ?? `${p.contact?.firstName ?? ""} ${p.contact?.lastName ?? ""}`.trim()) || p.id}</option>
          ))}
        </select>
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Category" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Receipt URL" value={form.receiptUrl} onChange={(e) => setForm((s) => ({ ...s, receiptUrl: e.target.value }))} />
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        <button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit" onClick={create}>Submit Expense</button>
      </section>

      <section className="space-y-2">
        {rows.map((row) => {
          const volunteer = (row.volunteerProfile?.user?.name ?? `${row.volunteerProfile?.contact?.firstName ?? ""} ${row.volunteerProfile?.contact?.lastName ?? ""}`.trim()) || "Volunteer";
          return (
            <div key={row.id} className="bg-white border rounded-xl p-4">
              <p className="font-semibold text-gray-900">{volunteer}</p>
              <p className="text-sm text-gray-500">${row.amount.toFixed(2)} · {row.category} · {row.status}</p>
              {row.receiptUrl && <a className="text-sm text-blue-700" href={row.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}
              <p className="text-sm text-gray-700 mt-2">{row.notes}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
