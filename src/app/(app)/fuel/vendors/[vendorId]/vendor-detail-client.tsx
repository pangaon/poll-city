"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Mail, Phone, Globe, Star, Plus, X,
  Send, CheckCircle2, Clock, AlertCircle, Edit2, Save,
} from "lucide-react";

interface PricingTier { id: string; name: string; pricePerHead: number; minHeads: number | null; maxHeads: number | null; leadTimeDays: number; includes: string | null; }
interface Agreement { id: string; title: string; discountPct: number | null; startDate: string | null; endDate: string | null; signedAt: string | null; notes: string | null; }
interface OutreachLog { id: string; step: string; status: string; subject: string | null; sentAt: string | null; repliedAt: string | null; bouncedAt: string | null; notes: string | null; }

interface Vendor {
  id: string; name: string; contactName: string | null; email: string | null; phone: string | null;
  city: string | null; province: string; website: string | null; notes: string | null;
  cuisineTypes: string[]; serviceTags: string[]; dietaryOptions: string[];
  sameDay: boolean; reliabilityScore: number; partnershipTier: number; status: string; isSeeded: boolean;
  pricingTiers: PricingTier[]; agreements: Agreement[]; outreachLogs: OutreachLog[];
}

const STEP_LABELS: Record<string, string> = { initial: "Initial Outreach", follow_up_1: "Follow-up 1", follow_up_2: "Follow-up 2" };
const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  replied: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  bounced: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  not_interested: <X className="w-3.5 h-3.5 text-gray-400" />,
  pending: <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

export default function VendorDetailClient({ campaignId, vendorId }: { campaignId: string; vendorId: string }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [pricingForm, setPricingForm] = useState({ name: "", pricePerHead: "", minHeads: "", maxHeads: "", leadTimeDays: "1", includes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/fuel/vendors/${vendorId}?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) { setVendor(res.data); setNotes(res.data.notes ?? ""); }
    setLoading(false);
  }, [campaignId, vendorId]);

  useEffect(() => { load(); }, [load]);

  async function sendOutreach(step: string) {
    if (!vendor) return;
    setSending(step);
    const res = await fetch("/api/fuel/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, vendorId, step }),
    }).then((r) => r.json());
    setSending(null);
    if (res.data) {
      toast.success(`${STEP_LABELS[step]} sent`);
      load();
    } else {
      toast.error(res.error ?? "Failed to send");
    }
  }

  async function addPricingTier() {
    if (!pricingForm.name || !pricingForm.pricePerHead) { toast.error("Name and price required"); return; }
    setSavingPricing(true);
    const res = await fetch(`/api/fuel/vendors/${vendorId}/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name: pricingForm.name,
        pricePerHead: parseFloat(pricingForm.pricePerHead),
        minHeads: pricingForm.minHeads ? parseInt(pricingForm.minHeads) : null,
        maxHeads: pricingForm.maxHeads ? parseInt(pricingForm.maxHeads) : null,
        leadTimeDays: parseInt(pricingForm.leadTimeDays),
        includes: pricingForm.includes || null,
      }),
    }).then((r) => r.json());
    setSavingPricing(false);
    if (res.data) {
      toast.success("Pricing tier added");
      setShowPricingForm(false);
      setPricingForm({ name: "", pricePerHead: "", minHeads: "", maxHeads: "", leadTimeDays: "1", includes: "" });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function saveNotes() {
    const res = await fetch(`/api/fuel/vendors/${vendorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, notes }),
    }).then((r) => r.json());
    if (res.data) { toast.success("Notes saved"); setEditNotes(false); load(); }
    else toast.error(res.error ?? "Failed");
  }

  if (loading) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl" />)}</div>;
  if (!vendor) return <div className="text-center py-12"><p className="text-gray-500">Vendor not found</p></div>;

  const sentSteps = new Set(vendor.outreachLogs.map((l) => l.step));
  const nextStep = !sentSteps.has("initial") ? "initial" : !sentSteps.has("follow_up_1") ? "follow_up_1" : !sentSteps.has("follow_up_2") ? "follow_up_2" : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/fuel/vendors" className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to vendors
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vendor.name}</h1>
              {vendor.isSeeded && <span className="text-xs text-gray-400">(demo data)</span>}
              {vendor.partnershipTier === 2 && <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">Partner</span>}
              {vendor.partnershipTier === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">Preferred</span>}
              {vendor.sameDay && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Same-day</span>}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {vendor.city && <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400"><MapPin className="w-3.5 h-3.5" />{vendor.city}, {vendor.province}</span>}
              {vendor.email && <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400"><Mail className="w-3.5 h-3.5" />{vendor.email}</span>}
              {vendor.phone && <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400"><Phone className="w-3.5 h-3.5" />{vendor.phone}</span>}
              {vendor.website && <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#0A2342] hover:underline"><Globe className="w-3.5 h-3.5" />Website</a>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-slate-400">Reliability</p>
            <p className={`text-xl font-bold ${vendor.reliabilityScore >= 75 ? "text-[#1D9E75]" : vendor.reliabilityScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{vendor.reliabilityScore}</p>
          </div>
        </div>
        {/* Tags */}
        {(vendor.dietaryOptions.length > 0 || vendor.serviceTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vendor.dietaryOptions.map((d) => <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-[#1D9E75]/10 text-[#1D9E75] dark:text-green-400">{d.replace(/_/g, " ")}</span>)}
            {vendor.serviceTags.map((t) => <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400">{t.replace(/_/g, " ")}</span>)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pricing + Agreements */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pricing tiers */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pricing Tiers</h2>
              <button onClick={() => setShowPricingForm(!showPricingForm)} className="flex items-center gap-1 text-xs text-[#0A2342] dark:text-blue-400 hover:underline">
                <Plus className="w-3 h-3" /> Add tier
              </button>
            </div>
            <AnimatePresence>
              {showPricingForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-gray-100 dark:border-slate-800">
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Tier name *", field: "name", type: "text", placeholder: "Event Package" },
                      { label: "Price per head ($) *", field: "pricePerHead", type: "number", placeholder: "12.50" },
                      { label: "Min headcount", field: "minHeads", type: "number", placeholder: "10" },
                      { label: "Max headcount", field: "maxHeads", type: "number", placeholder: "100" },
                      { label: "Lead time (days)", field: "leadTimeDays", type: "number", placeholder: "1" },
                      { label: "Includes", field: "includes", type: "text", placeholder: "Sandwiches, drinks, setup" },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
                        <input
                          type={type}
                          value={(pricingForm as Record<string, string>)[field]}
                          onChange={(e) => setPricingForm((f) => ({ ...f, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4 flex gap-2">
                    <button onClick={() => setShowPricingForm(false)} className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                    <button onClick={addPricingTier} disabled={savingPricing} className="px-3 py-1.5 bg-[#0A2342] text-white rounded text-sm hover:bg-[#0A2342]/90 disabled:opacity-50">{savingPricing ? "Saving..." : "Add Tier"}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {vendor.pricingTiers.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-slate-500 text-center">No pricing tiers yet</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {vendor.pricingTiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tier.name}</p>
                      {tier.includes && <p className="text-xs text-gray-500 dark:text-slate-400">{tier.includes}</p>}
                      {(tier.minHeads || tier.maxHeads) && (
                        <p className="text-xs text-gray-400">{tier.minHeads ?? "1"}–{tier.maxHeads ?? "∞"} people</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">${Number(tier.pricePerHead).toFixed(2)}/head</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{tier.leadTimeDays}d lead time</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agreements */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Agreements</h2>
            </div>
            {vendor.agreements.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-slate-500 text-center">No agreements on file</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {vendor.agreements.map((ag) => (
                  <div key={ag.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ag.title}</p>
                      {ag.signedAt ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />Signed</span> : <span className="text-xs text-amber-600">Unsigned</span>}
                    </div>
                    {ag.discountPct && <p className="text-xs text-[#1D9E75] mt-0.5">{ag.discountPct}% discount</p>}
                    {ag.notes && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{ag.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h2>
              <button onClick={() => setEditNotes(!editNotes)} className="text-xs text-[#0A2342] dark:text-blue-400 hover:underline flex items-center gap-1">
                {editNotes ? <><Save className="w-3 h-3" /> Save</> : <><Edit2 className="w-3 h-3" /> Edit</>}
              </button>
            </div>
            <div className="p-4">
              {editNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342] resize-none"
                    placeholder="Internal notes about this vendor..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditNotes(false); setNotes(vendor.notes ?? ""); }} className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-sm rounded hover:bg-gray-50 dark:hover:bg-slate-800">Cancel</button>
                    <button onClick={saveNotes} className="px-3 py-1.5 bg-[#0A2342] text-white text-sm rounded hover:bg-[#0A2342]/90">Save</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{vendor.notes || <span className="text-gray-400 italic">No notes</span>}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Outreach CRM */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Outreach Sequence</h2>
              {!vendor.email && <p className="text-xs text-amber-600 mt-0.5">No email on file — add email to enable sending</p>}
            </div>
            <div className="p-4 space-y-3">
              {(["initial", "follow_up_1", "follow_up_2"] as const).map((step) => {
                const log = vendor.outreachLogs.find((l) => l.step === step);
                const isNext = step === nextStep;
                return (
                  <div key={step} className={`rounded-lg border p-3 ${log ? "border-gray-100 dark:border-slate-800" : "border-dashed border-gray-200 dark:border-slate-700"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{STEP_LABELS[step]}</span>
                      {log ? (
                        <span className="flex items-center gap-1 text-xs">{STATUS_ICON[log.status]}{log.status}</span>
                      ) : (
                        <span className="text-xs text-gray-400">Not sent</span>
                      )}
                    </div>
                    {log ? (
                      <div className="space-y-0.5">
                        {log.sentAt && <p className="text-xs text-gray-500 dark:text-slate-400">Sent {new Date(log.sentAt).toLocaleDateString("en-CA")}</p>}
                        {log.repliedAt && <p className="text-xs text-green-600">Replied {new Date(log.repliedAt).toLocaleDateString("en-CA")}</p>}
                        {log.subject && <p className="text-xs text-gray-400 italic truncate">{log.subject}</p>}
                      </div>
                    ) : isNext && (
                      <button
                        onClick={() => sendOutreach(step)}
                        disabled={sending !== null || !vendor.email}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#0A2342] text-white rounded text-xs font-medium hover:bg-[#0A2342]/90 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {sending === step ? "Sending..." : `Send ${STEP_LABELS[step]}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
