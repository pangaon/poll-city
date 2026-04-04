"use client";

import { useEffect, useMemo, useState } from "react";

export default function VolunteerShiftsClient({ campaignId }: { campaignId: string }) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [form, setForm] = useState({
    name: "",
    shiftDate: "",
    startTime: "17:00",
    endTime: "20:00",
    meetingLocation: "",
    targetTurfArea: "",
    maxVolunteers: 10,
    minVolunteers: 3,
    notes: "",
  });

  async function load() {
    const res = await fetch(`/api/volunteers/shifts?campaignId=${campaignId}`);
    const data = await res.json();
    setShifts(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function createShift() {
    await fetch("/api/volunteers/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, campaignId }),
    });
    setForm({
      name: "",
      shiftDate: "",
      startTime: "17:00",
      endTime: "20:00",
      meetingLocation: "",
      targetTurfArea: "",
      maxVolunteers: 10,
      minVolunteers: 3,
      notes: "",
    });
    load();
  }

  async function runReminders() {
    await fetch("/api/volunteers/shifts/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
  }

  const groupedByDate = useMemo(() => {
    return shifts.reduce<Record<string, any[]>>((acc, shift) => {
      const key = new Date(shift.shiftDate).toLocaleDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(shift);
      return acc;
    }, {});
  }, [shifts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Volunteer Shifts</h1>
          <p className="text-sm text-gray-500">Create shifts, track signup counts, and manage check-ins with QR-style codes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("calendar")} className={`px-3 py-2 rounded-lg text-sm ${view === "calendar" ? "bg-blue-700 text-white" : "border"}`}>Calendar</button>
          <button onClick={() => setView("list")} className={`px-3 py-2 rounded-lg text-sm ${view === "list" ? "bg-blue-700 text-white" : "border"}`}>List</button>
          <button onClick={runReminders} className="px-3 py-2 rounded-lg text-sm border">Send Reminders</button>
        </div>
      </div>

      <section className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Shift name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="date" value={form.shiftDate} onChange={(e) => setForm((s) => ({ ...s, shiftDate: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="time" value={form.startTime} onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="time" value={form.endTime} onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Meeting location address" value={form.meetingLocation} onChange={(e) => setForm((s) => ({ ...s, meetingLocation: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" placeholder="Target turf area" value={form.targetTurfArea} onChange={(e) => setForm((s) => ({ ...s, targetTurfArea: e.target.value }))} />
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Max volunteers" value={form.maxVolunteers} onChange={(e) => setForm((s) => ({ ...s, maxVolunteers: Number(e.target.value) }))} />
        <input className="border rounded-lg px-3 py-2" type="number" placeholder="Min volunteers" value={form.minVolunteers} onChange={(e) => setForm((s) => ({ ...s, minVolunteers: Number(e.target.value) }))} />
        <textarea className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Notes for volunteers" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
        <button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm w-fit" onClick={createShift}>Create Shift</button>
      </section>

      {view === "calendar" ? (
        <section className="space-y-4">
          {Object.entries(groupedByDate).map(([date, entries]) => (
            <div key={date} className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{date}</h3>
              <div className="space-y-2">
                {entries.map((shift) => (
                  <div key={shift.id} className="border rounded-lg p-3">
                    <p className="font-medium">{shift.name}</p>
                    <p className="text-sm text-gray-500">{shift.startTime} - {shift.endTime} · {shift.meetingLocation}</p>
                    <p className="text-xs text-gray-500">Attendance: {shift.signups.filter((s: any) => s.status === "attended").length} / {shift.signups.length} · Check-in code: {shift.checkInCode}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedByDate).length === 0 && <p className="text-sm text-gray-500">No shifts created yet.</p>}
        </section>
      ) : (
        <section className="space-y-2">
          {shifts.map((shift) => (
            <div key={shift.id} className="bg-white border rounded-xl p-4">
              <p className="font-semibold text-gray-900">{shift.name}</p>
              <p className="text-sm text-gray-500">{new Date(shift.shiftDate).toLocaleString()} · {shift.meetingLocation}</p>
              <p className="text-xs text-gray-500">Target turf: {shift.targetTurfArea || "N/A"} · Min/Max: {shift.minVolunteers}/{shift.maxVolunteers}</p>
              <p className="text-xs text-gray-500">QR check-in code: {shift.checkInCode}</p>
            </div>
          ))}
          {shifts.length === 0 && <p className="text-sm text-gray-500">No shifts to display.</p>}
        </section>
      )}
    </div>
  );
}
