"use client";
/**
 * Quick Capture — On-the-fly data capture for canvassers
 *
 * When a campaign runs into someone in the field and things get messy.
 * This is the "grab it now, organize later" screen.
 *
 * Three flows:
 * 1. Volunteer sign-up (at the door, at an event)
 * 2. Sign request (I want a lawn sign)
 * 3. Donation pledge (I want to donate)
 *
 * Each flow is under 60 seconds. Push notification fires to staff immediately.
 */
import { useState } from "react";
import { Users, Flag, DollarSign, Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CaptureType = "volunteer" | "sign" | "donation" | null;

interface Props {
  campaignId: string;
  prefillAddress?: string;  // pre-fill from address lookup
  prefillContactId?: string;
  onClose?: () => void;
}

export default function QuickCapture({ campaignId, prefillAddress, prefillContactId, onClose }: Props) {
  const [type, setType] = useState<CaptureType>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  if (done) return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <div>
        <p className="font-bold text-gray-900 text-lg">Captured!</p>
        <p className="text-sm text-gray-500 mt-1">Staff has been notified</p>
      </div>
      <button onClick={() => { setDone(false); setType(null); onClose?.(); }}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm">
        Done
      </button>
    </div>
  );

  if (!type) return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Quick Capture</h2>
        {onClose && <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>}
      </div>
      <p className="text-sm text-gray-500">What happened?</p>
      <div className="space-y-3">
        {[
          { type: "volunteer" as const, icon: <Users className="w-6 h-6" />, label: "Volunteer Sign-up", desc: "Someone wants to help the campaign", color: "bg-blue-50 border-blue-200 text-blue-700" },
          { type: "sign" as const, icon: <Flag className="w-6 h-6" />, label: "Sign Request", desc: "They want a lawn sign", color: "bg-orange-50 border-orange-200 text-orange-700" },
          { type: "donation" as const, icon: <DollarSign className="w-6 h-6" />, label: "Donation Pledge", desc: "They want to donate", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(({ type: t, icon, label, desc, color }) => (
          <button key={t} onClick={() => setType(t)}
            className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 active:scale-98 transition-all text-left", color)}>
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{label}</p>
              <p className="text-xs opacity-75">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <CaptureForm
      type={type}
      campaignId={campaignId}
      prefillAddress={prefillAddress}
      prefillContactId={prefillContactId}
      onBack={() => setType(null)}
      onSuccess={() => setDone(true)}
    />
  );
}

function CaptureForm({ type, campaignId, prefillAddress, prefillContactId, onBack, onSuccess }: {
  type: CaptureType; campaignId: string; prefillAddress?: string; prefillContactId?: string;
  onBack: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    address: prefillAddress ?? "",
    // Sign specific
    signType: "small",
    // Donation specific
    amount: "", method: "cash",
    // Volunteer specific
    availability: "", hasVehicle: false,
    // Shared
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    try {
      let endpoint = "";
      let payload: Record<string, unknown> = { campaignId, contactId: prefillContactId, notes: form.notes };

      if (type === "volunteer") {
        endpoint = "/api/volunteers/quick-capture";
        payload = { ...payload, firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email, address: form.address, availability: form.availability, hasVehicle: form.hasVehicle };
      } else if (type === "sign") {
        endpoint = "/api/signs/quick-capture";
        payload = { ...payload, firstName: form.firstName, lastName: form.lastName, phone: form.phone, address: form.address, signType: form.signType };
      } else if (type === "donation") {
        endpoint = "/api/donations/quick-capture";
        payload = { ...payload, firstName: form.firstName, lastName: form.lastName, phone: form.phone, address: form.address, amount: parseFloat(form.amount) || 0, method: form.method };
      }

      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Captured! Staff notified.");
        onSuccess();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to save");
      }
    } finally { setSaving(false); }
  }

  const SIGN_TYPES = [
    { value: "small", label: "Small Sign" },
    { value: "large", label: "Large Sign" },
    { value: "window", label: "Window Sign" },
    { value: "billboard", label: "Billboard" },
  ];

  const PAYMENT_METHODS = [
    { value: "cash", label: "💵 Cash" },
    { value: "cheque", label: "📝 Cheque" },
    { value: "credit", label: "💳 Credit Card" },
    { value: "etransfer", label: "📲 e-Transfer" },
  ];

  const titles: Record<string, string> = { volunteer: "🙋 Volunteer Sign-up", sign: "🪧 Sign Request", donation: "💰 Donation Pledge" };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        <h2 className="font-bold text-gray-900">{titles[type!]}</h2>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
          <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
            placeholder="Jane" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
          <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
            placeholder="Smith" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
        <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
          placeholder="416-555-0100" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
        <input value={form.address} onChange={e => set("address", e.target.value)}
          placeholder="123 Main Street" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Sign type picker */}
      {type === "sign" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Sign Type</label>
          <div className="grid grid-cols-2 gap-2">
            {SIGN_TYPES.map(({ value, label }) => (
              <button key={value} onClick={() => set("signType", value)}
                className={cn("py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  form.signType === value ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Donation amount */}
      {type === "donation" && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pledge Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="100" className="w-full text-sm border border-gray-300 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button key={value} onClick={() => set("method", value)}
                  className={cn("py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                    form.method === value ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-200")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Volunteer extras */}
      {type === "volunteer" && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Availability</label>
            <input value={form.availability} onChange={e => set("availability", e.target.value)}
              placeholder="Weekends, evenings…" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hasVehicle} onChange={e => set("hasVehicle", e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm font-medium text-gray-700">Has a vehicle 🚗</span>
          </label>
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Any context for staff…" rows={2}
          className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {/* Submit */}
      <button onClick={submit} disabled={saving}
        className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-sm active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <><span className="animate-spin">⏳</span>Saving…</> : <><Check className="w-4 h-4" />Capture & Notify Staff</>}
      </button>
    </div>
  );
}
