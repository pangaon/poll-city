"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stage = "form" | "submitting" | "error";

interface PasswordFeedback {
  errors: string[];
}

export default function SignupPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [feedback, setFeedback] = useState<PasswordFeedback | null>(null);
  const [error, setError] = useState("");

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setStage("submitting");

    // 1. Register
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
    });

    const data = await res.json().catch(() => ({})) as { error?: string; details?: string[] };

    if (!res.ok) {
      const msg = Array.isArray(data.details) && data.details.length > 0
        ? data.details.join(". ")
        : (data.error ?? "Registration failed. Please try again.");
      setError(msg);
      if (msg.toLowerCase().includes("password")) {
        setFeedback({ errors: Array.isArray(data.details) ? data.details : [msg] });
      }
      setStage("form");
      return;
    }

    // 2. Sign in immediately after registration
    const result = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      setStage("form");
      return;
    }

    // 3. Send them to create their first campaign
    router.push("/campaigns/new");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
            <span className="text-2xl">🗳️</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Poll City</h1>
          <p className="text-blue-200 mt-1 text-sm">Campaign Operations Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-6">Set up your campaign in under 5 minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Jane Smith"
                disabled={stage === "submitting"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="jane@campaign.ca"
                disabled={stage === "submitting"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Min. 10 characters, uppercase + number + symbol"
                disabled={stage === "submitting"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Re-enter password"
                disabled={stage === "submitting"}
              />
            </div>

            {/* Password policy hint */}
            {feedback && feedback.errors.length > 0 && (
              <ul className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 space-y-1 list-disc list-inside">
                {feedback.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}

            {error && !feedback && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={stage === "submitting"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {stage === "submitting" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>

        <div className="text-center mt-6 flex items-center justify-center gap-4 text-xs text-blue-200">
          <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <span className="opacity-40">·</span>
          <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
