"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, CreditCard, ExternalLink, Printer } from "lucide-react";

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

type Shop = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  provincesServed: string[];
  specialties: string[];
  averageResponseHours: number | null;
  isVerified: boolean;
  stripeOnboarded: boolean;
  stripeAccountId: string | null;
};

export default function VendorProfilePage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    website: "",
    description: "",
    provincesServed: [] as string[],
    specialties: [] as string[],
    averageResponseHours: "",
  });

  useEffect(() => {
    fetch("/api/vendor/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          const s: Shop = d.data;
          setShop(s);
          setForm({
            name: s.name,
            contactName: s.contactName ?? "",
            phone: s.phone ?? "",
            website: s.website ?? "",
            description: s.description ?? "",
            provincesServed: s.provincesServed ?? [],
            specialties: s.specialties ?? [],
            averageResponseHours: s.averageResponseHours?.toString() ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Business name is required." });
      return;
    }
    if (form.specialties.length === 0) {
      setMessage({ type: "error", text: "Select at least one product specialty." });
      return;
    }
    if (form.provincesServed.length === 0) {
      setMessage({ type: "error", text: "Select at least one province you serve." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vendor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          provincesServed: form.provincesServed,
          specialties: form.specialties,
          averageResponseHours: form.averageResponseHours
            ? parseInt(form.averageResponseHours)
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save." });
      } else {
        setShop(data.data);
        setMessage({ type: "success", text: "Profile updated successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function startStripeConnect() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/vendor/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error ?? "Could not start Stripe setup." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setStripeLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-48 animate-pulse" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">Shop not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shop Profile</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {shop.isVerified ? (
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> Verified vendor
              </span>
            ) : (
              <span className="text-amber-600">Verification pending — George reviews new shops</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{shop.email}</span>
        </div>
      </div>

      {/* Stripe banner */}
      {!shop.stripeOnboarded && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <CreditCard className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Set up payments to get paid</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Connect your bank account via Stripe to receive payment when jobs are awarded to you.
            </p>
          </div>
          <button
            onClick={startStripeConnect}
            disabled={stripeLoading}
            className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {stripeLoading ? "Loading…" : "Connect Stripe"}
          </button>
        </div>
      )}

      {shop.stripeOnboarded && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm font-medium">Stripe payments enabled — you can receive job payments.</p>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                placeholder="416-555-0123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Response Time (hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                placeholder="24"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                value={form.averageResponseHours}
                onChange={(e) => set("averageResponseHours", e.target.value)}
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
          <h2 className="font-semibold text-gray-900 mb-1">Product Specialties</h2>
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

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#1D9E75] text-white py-3 rounded-xl font-semibold hover:bg-[#17865f] transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
