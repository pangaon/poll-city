"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ROLE_LABELS: Record<string, { emoji: string; label: string; description: string }> = {
  ADMIN: { emoji: "👑", label: "Admin", description: "Full campaign control and security settings." },
  CAMPAIGN_MANAGER: { emoji: "🧭", label: "Campaign Manager", description: "Runs daily operations and team execution." },
  VOLUNTEER_LEADER: { emoji: "📣", label: "Volunteer Leader", description: "Coordinates shifts and field assignments." },
  VOLUNTEER: { emoji: "🚪", label: "Canvasser", description: "Works turf, logs contacts, and reports outcomes." },
};

export default function JoinByTokenPage({ params }: { params: { token: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kiosk = searchParams?.get("kiosk") === "true";
  const role = searchParams?.get("role") || "VOLUNTEER";
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.VOLUNTEER;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const campaignName = useMemo(() => "Poll City Campaign", []);

  async function submitForm(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Please enter your name.");
      return;
    }
    if (!kiosk && (!email.trim() || !password.trim())) {
      setMessage("Please enter email and password.");
      return;
    }
    if (kiosk && !phone.trim()) {
      setMessage("Phone number is required in kiosk mode.");
      return;
    }

    setMessage(`Welcome ${name}! You are all set.`);

    if (kiosk) {
      window.setTimeout(() => {
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setMessage("");
      }, 3000);
      return;
    }

    window.setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  }

  return (
    <main className={kiosk ? "min-h-screen bg-slate-100 py-6" : "min-h-screen bg-slate-50 py-10"}>
      <div className={kiosk ? "mx-auto max-w-3xl px-4" : "mx-auto max-w-xl px-4"}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Join Campaign Team</p>
            <h1 className={kiosk ? "mt-2 text-4xl font-extrabold text-slate-900" : "mt-2 text-2xl font-bold text-slate-900"}>{campaignName}</h1>
            <p className="mt-2 text-slate-700">
              You are joining as {roleInfo.emoji} {roleInfo.label}
            </p>
            <p className="mt-1 text-sm text-slate-500">{roleInfo.description}</p>
          </div>

          <form className={kiosk ? "mt-6 space-y-4" : "mt-6 space-y-3"} onSubmit={submitForm}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={kiosk ? "w-full rounded-xl border border-slate-300 px-4 py-4 text-xl" : "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"}
            />
            {!kiosk && (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className={kiosk ? "w-full rounded-xl border border-slate-300 px-4 py-4 text-xl" : "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"}
            />
            {!kiosk && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            {!kiosk && (
              <button
                type="button"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue with Google
              </button>
            )}

            <button
              type="submit"
              className={kiosk ? "w-full rounded-xl bg-blue-700 px-4 py-4 text-xl font-semibold text-white hover:bg-blue-800" : "w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"}
            >
              Join campaign
            </button>

            {message && (
              <p className={kiosk ? "rounded-xl bg-emerald-50 p-4 text-center text-lg font-semibold text-emerald-700" : "rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700"}>
                {message}
              </p>
            )}
          </form>

          {!kiosk && (
            <p className="mt-4 text-center text-xs text-slate-500">Token: {params.token}</p>
          )}
        </div>
      </div>
    </main>
  );
}
