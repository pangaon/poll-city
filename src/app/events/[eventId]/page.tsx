"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicEventRsvpPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitRsvp(event: FormEvent) {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      setMessage("Please enter name and email.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/public/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          notes: `${notes}${notes ? " | " : ""}Guests: ${guestCount}`,
          status: "going",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit RSVP");
      }

      setMessage("Thanks, your RSVP is confirmed. A campaign team member will follow up if needed.");
      setName("");
      setEmail("");
      setPhone("");
      setGuestCount(1);
      setNotes("");
    } catch (error) {
      setMessage((error as Error).message || "Unable to submit RSVP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Public RSVP</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Campaign Event RSVP</h1>
          <p className="mt-2 text-sm text-slate-600">
            Share your details to reserve your spot. We will send updates and event reminders to your email.
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Event details</p>
            <p className="mt-1">Date and time: Confirmed in RSVP email</p>
            <p>Location: Shared with registered attendees</p>
            <p>Event ID: {eventId}</p>
          </div>

          <form className="mt-5 space-y-3" onSubmit={submitRsvp}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={guestCount} onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))} type="number" min={1} max={10} placeholder="Guest count" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know" className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
              {loading ? "Submitting..." : "Confirm RSVP"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{message}</p>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Looking for campaign updates instead? <Link href="/" className="text-blue-700 hover:underline">Visit Poll City</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
