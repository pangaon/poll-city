"use client";

import { useEffect, useState } from "react";

const tasks = ["Lawn sign host", "Phone banker", "Event volunteer", "Donor ask"];

export default function SuperSupportersClient({ campaignId }: { campaignId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [taskRows, setTaskRows] = useState<any[]>([]);

  async function load() {
    const [contactsRes, tasksRes] = await Promise.all([
      fetch(`/api/contacts?campaignId=${campaignId}&pageSize=200`),
      fetch(`/api/contacts?campaignId=${campaignId}&pageSize=200&supportLevels=strong_support`),
    ]);
    const all = await contactsRes.json();
    const supporters = (all.data ?? []).filter((c: any) => c.superSupporter);
    const top = await tasksRes.json();
    setContacts(supporters);
    setTaskRows((top.data ?? []).map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, assignedTask: "" })));
  }

  useEffect(() => { load(); }, [campaignId]);

  async function toggleSuperSupporter(contactId: string, value: boolean) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superSupporter: value }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Super Supporter Program</h1>
        <p className="text-sm text-gray-500">Track top supporters and assign high-impact campaign tasks.</p>
      </div>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Super Supporters ({contacts.length})</h2>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                <p className="text-xs text-gray-500">{contact.email || contact.phone || "No direct contact"}</p>
              </div>
              <button className="border rounded-lg px-3 py-1.5 text-sm" onClick={() => toggleSuperSupporter(contact.id, false)}>Remove</button>
            </div>
          ))}
          {contacts.length === 0 && <p className="text-sm text-gray-500">No super supporters marked yet.</p>}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Assign Special Tasks</h2>
        <div className="space-y-2">
          {taskRows.map((row) => (
            <div key={row.id} className="grid md:grid-cols-3 gap-2 items-center border rounded-lg p-2">
              <p className="text-sm">{row.name}</p>
              <select className="border rounded-lg px-3 py-2 text-sm" onChange={(e) => setTaskRows((prev) => prev.map((r) => r.id === row.id ? { ...r, assignedTask: e.target.value } : r))} value={row.assignedTask}>
                <option value="">Select task</option>
                {tasks.map((task) => <option key={task} value={task}>{task}</option>)}
              </select>
              <button className="bg-blue-700 text-white rounded-lg px-3 py-2 text-sm">Assign</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
