"use client";

import { useEffect, useState } from "react";

export default function EventsClient({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", eventDate: "", location: "", capacity: 0, description: "", isPublic: true });

  async function load() {
    const res = await fetch(`/api/events?campaignId=${campaignId}`);
    const data = await res.json();
    setEvents(data.data ?? []);
  }

  useEffect(() => { load(); }, [campaignId]);

  async function create() {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form }),
    });
    setForm({ name: "", eventDate: "", location: "", capacity: 0, description: "", isPublic: true });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Event Management</h1>
        <p className="text-sm text-gray-500">Create campaign events, track RSVP totals, and run follow-up.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Event name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="datetime-local" value={form.eventDate} onChange={(e) => setForm((s) => ({ ...s, eventDate: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Location" value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm((s) => ({ ...s, capacity: Number(e.target.value) }))} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((s) => ({ ...s, isPublic: e.target.checked }))} />Public on candidate page</label>
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
        <button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit" onClick={create}>Create Event</button>
      </section>

      <section className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold text-gray-900">{event.name}</p>
            <p className="text-sm text-gray-500">{new Date(event.eventDate).toLocaleString()} · {event.location}</p>
            <p className="text-xs text-gray-500">Capacity: {event.capacity ?? "N/A"} · RSVP count: {event.rsvps.length} · Attended: {event.rsvps.filter((r: any) => r.attended).length}</p>
            <p className="text-sm text-gray-700 mt-2">{event.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
