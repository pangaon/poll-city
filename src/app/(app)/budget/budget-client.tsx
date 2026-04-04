"use client";

import { useEffect, useMemo, useState } from "react";

export default function BudgetClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<{ items: any[]; totals: { allocation: number; expense: number }; remaining: number }>({
    items: [],
    totals: { allocation: 0, expense: 0 },
    remaining: 0,
  });
  const [form, setForm] = useState({ itemType: "allocation", category: "", amount: 0, description: "", incurredAt: "" });

  async function load() {
    const res = await fetch(`/api/budget?campaignId=${campaignId}`);
    const payload = await res.json();
    setData(payload.data ?? { items: [], totals: { allocation: 0, expense: 0 }, remaining: 0 });
  }

  useEffect(() => { load(); }, [campaignId]);

  async function create() {
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setForm({ itemType: "allocation", category: "", amount: 0, description: "", incurredAt: "" });
    load();
  }

  const byCategory = useMemo(() => {
    const map = new Map<string, { allocation: number; expense: number }>();
    for (const item of data.items) {
      const row = map.get(item.category) ?? { allocation: 0, expense: 0 };
      if (item.itemType === "allocation") row.allocation += item.amount;
      else row.expense += item.amount;
      map.set(item.category, row);
    }
    return Array.from(map.entries()).map(([category, values]) => ({ category, ...values, remaining: values.allocation - values.expense }));
  }, [data.items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Budget Tracker</h1>
        <p className="text-sm text-gray-500">Track allocations vs real spending and alert as categories approach limits.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <BudgetStat label="Total budget" value={data.totals.allocation} />
        <BudgetStat label="Actual spend" value={data.totals.expense} />
        <BudgetStat label="Remaining" value={data.remaining} />
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <select className="border rounded-lg px-3 py-2" value={form.itemType} onChange={(e) => setForm((s) => ({ ...s, itemType: e.target.value }))}>
          <option value="allocation">Allocation</option>
          <option value="expense">Expense</option>
        </select>
        <input className="border rounded-lg px-3 py-2" placeholder="Category (signs, print, events...)" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))} />
        <input className="border rounded-lg px-3 py-2" type="date" value={form.incurredAt} onChange={(e) => setForm((s) => ({ ...s, incurredAt: e.target.value }))} />
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
        <button onClick={create} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit">Add Budget Item</button>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Category Overview</h2>
        <div className="space-y-2">
          {byCategory.map((row) => (
            <div key={row.category} className="border rounded-lg px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{row.category}</span>
                <span className={row.remaining < row.allocation * 0.1 ? "text-red-600 font-semibold" : "text-gray-700"}>${row.remaining.toFixed(2)} remaining</span>
              </div>
              <p className="text-xs text-gray-500">Allocated ${row.allocation.toFixed(2)} · Spent ${row.expense.toFixed(2)}</p>
            </div>
          ))}
          {byCategory.length === 0 && <p className="text-sm text-gray-500">No budget data yet.</p>}
        </div>
      </section>
    </div>
  );
}

function BudgetStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">${value.toFixed(2)}</p>
    </div>
  );
}
