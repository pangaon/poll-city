"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Printer, CheckCircle } from "lucide-react";

const SPECIALTIES = [
  { id: "lawn_signs", label: "Lawn Signs" },
  { id: "door_hangers", label: "Door Hangers" },
  { id: "flyers", label: "Flyers" },
  { id: "palm_cards", label: "Palm Cards" },
  { id: "mailers", label: "Mailers" },
  { id: "buttons", label: "Buttons" },
  { id: "banners", label: "Banners" },
  { id: "posters", label: "Posters" },
  { id: "brochures", label: "Brochures" },
  { id: "other", label: "Other" },
];

const PROVINCES = [
  ["ON", "Ontario"],
  ["BC", "British Columbia"],
  ["AB", "Alberta"],
  ["QC", "Quebec"],
  ["MB", "Manitoba"],
  ["SK", "Saskatchewan"],
  ["NS", "Nova Scotia"],
  ["NB", "New Brunswick"],
];

export default function VendorSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    website: "",
    description: "",
    provincesServed: [] as string[],
    specialties: [] as string[],
    averageResponseHours: "24",
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function toggle(field: "provincesServed" | "specialties", value: string) {
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Business name, email, and password are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.specialties.length === 0) {
      setError("Select at least one product specialty.");
      return;
    }
    if (form.provincesServed.length === 0) {
      setError("Select at least one province you serve.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vendor/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || undefined,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          provincesServed: form.provincesServed,
          specialties: form.specialties,
          averageResponseHours: parseInt(form.averageResponseHours),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      // Auto sign in
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/vendor/dashboard");
      } else {
        setStep("done");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your vendor account has been created. Sign in to access your job board.
          </p>
          <Link
            href="/login"
            className="block bg-[#1D9E75] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#17865f] transition-colors"
          >
            Sign In to Vendor Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Printer className="w-6 h-6 text-[#1D9E75]" />
            <span className="font-bold text-[#0A2342] text-lg">Poll City Print</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register Your Print Shop</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Join the Poll City print network and bid on campaign print jobs across Canada.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Account */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Your Login Account</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="orders@yourshop.ca"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Business info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Business Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Acme Print Co."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="416-555-0123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                placeholder="https://yourshop.ca"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About Your Shop</label>
              <textarea
                rows={3}
                placeholder="Describe your capabilities, turnaround times, and what makes your shop great for political campaigns…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Product Specialties</h2>
            <p className="text-sm text-gray-500 mb-3">Select all products you can produce:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPECIALTIES.map(({ id, label }) => {
                const active = form.specialties.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle("specialties", id)}
                    className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-center ${
                      active
                        ? "border-[#1D9E75] bg-green-50 text-green-800"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provinces */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Provinces You Serve</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROVINCES.map(([code, name]) => {
                const active = form.provincesServed.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle("provincesServed", code)}
                    className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-center ${
                      active
                        ? "border-[#1D9E75] bg-green-50 text-green-800"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1D9E75] text-white py-3 rounded-xl font-semibold hover:bg-[#17865f] transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Creating your account…" : "Create Vendor Account"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[#1D9E75] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
