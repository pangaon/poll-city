"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Clock, MapPin, Users, DollarSign, Leaf,
  Plus, CheckCircle2, ShoppingBag, AlertTriangle,
} from "lucide-react";

interface ScoreBreakdown {
  priceScore: number; reliabilityScore: number; leadTimeScore: number;
  distanceScore: number; dietaryFitScore: number; partnershipScore: number; totalScore: number;
}
interface RankedVendor {
  vendor: { id: string; name: string; city: string | null; reliabilityScore: number; partnershipTier: number };
  score: ScoreBreakdown;
  estimatedPricePerHead: number | null;
}
interface Quote {
  id: string; vendorId: string; totalAmountCad: number; pricePerHead: number;
  leadTimeDays: number; includesDelivery: boolean; dietaryFit: string | null;
  isManualEntry: boolean; isSelected: boolean;
  vendor: { name: string; city: string | null };
}
interface FoodOrder {
  id: string; status: string; scheduledFor: string | null; deliveryMode: string;
  confirmedAmountCad: number | null; expenseId: string | null;
}
interface FoodRequest {
  id: string; requestType: string; status: string; headcount: number;
  neededBy: string; location: string | null; budgetCapCad: number | null;
  notes: string | null; dietaryNotes: string | null;
  requestedBy: { name: string | null; email: string | null };
  quotes: Quote[];
  order: FoodOrder | null;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  hq_daily: "HQ Daily", event: "Event", phone_bank: "Phone Bank",
  canvassing: "Canvassing", sign_crew: "Sign Crew", volunteer_meal: "Volunteer Meal", other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", quoting: "bg-yellow-100 text-yellow-700",
  quoted: "bg-sky-100 text-sky-700", ordered: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = value >= 80 ? "bg-[#1D9E75]" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 w-6 text-right">{value}</span>
      <span className="text-xs text-gray-400 w-8">{weight}</span>
    </div>
  );
}

export default function RequestDetailClient({ campaignId, requestId }: { campaignId: string; requestId: string }) {
  const [request, setRequest] = useState<FoodRequest | null>(null);
  const [ranked, setRanked] = useState<RankedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState<string | null>(null); // vendorId
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [selectingQuote, setSelectingQuote] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ totalAmountCad: "", pricePerHead: "", leadTimeDays: "1", includesDelivery: false, dietaryFit: "", details: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/fuel/requests/${requestId}?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) { setRequest(res.data); setRanked(res.rankedVendors ?? []); }
    setLoading(false);
  }, [campaignId, requestId]);

  useEffect(() => { load(); }, [load]);

  async function addQuote(vendorId: string) {
    if (!quoteForm.totalAmountCad) { toast.error("Total amount required"); return; }
    setSubmittingQuote(true);
    const res = await fetch(`/api/fuel/requests/${requestId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId, vendorId,
        totalAmountCad: parseFloat(quoteForm.totalAmountCad),
        pricePerHead: quoteForm.pricePerHead ? parseFloat(quoteForm.pricePerHead) : parseFloat(quoteForm.totalAmountCad) / (request?.headcount ?? 1),
        leadTimeDays: parseInt(quoteForm.leadTimeDays),
        includesDelivery: quoteForm.includesDelivery,
        dietaryFit: quoteForm.dietaryFit || null,
        details: quoteForm.details || null,
        isManualEntry: true,
      }),
    }).then((r) => r.json());
    setSubmittingQuote(false);
    if (res.data) {
      toast.success("Quote added");
      setShowQuoteForm(null);
      setQuoteForm({ totalAmountCad: "", pricePerHead: "", leadTimeDays: "1", includesDelivery: false, dietaryFit: "", details: "" });
      load();
    } else toast.error(res.error ?? "Failed");
  }

  async function selectQuote(quoteId: string) {
    setSelectingQuote(quoteId);
    const res = await fetch(`/api/fuel/requests/${requestId}/quotes/${quoteId}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, deliveryMode: "delivery" }),
    }).then((r) => r.json());
    setSelectingQuote(null);
    if (res.data) { toast.success("Order confirmed"); load(); }
    else toast.error(res.error ?? "Failed");
  }

  if (loading) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-slate-800 rounded-xl" />)}</div>;
  if (!request) return <div className="text-center py-12"><p className="text-gray-500">Request not found</p></div>;

  const hoursLeft = Math.round((new Date(request.neededBy).getTime() - Date.now()) / 3_600_000);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/fuel/requests" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to requests
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {REQUEST_TYPE_LABELS[request.requestType]} — {request.headcount} people
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[request.status] ?? ""}`}>{request.status}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{hoursLeft <= 0 ? "OVERDUE" : hoursLeft <= 48 ? `${hoursLeft}h remaining` : new Date(request.neededBy).toLocaleString("en-CA")}</span>
              {request.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{request.location}</span>}
              {request.budgetCapCad && <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />Budget: ${Number(request.budgetCapCad).toFixed(0)}</span>}
              {request.dietaryNotes && <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-green-500" />{request.dietaryNotes}</span>}
            </div>
          </div>
        </div>
        {request.notes && <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">{request.notes}</p>}
      </div>

      {/* Active order */}
      {request.order && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${request.order.status === "delivered" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"}`}>
          <ShoppingBag className={`w-5 h-5 ${request.order.status === "delivered" ? "text-green-600" : "text-indigo-600"}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Order {request.order.status.replace(/_/g, " ")}
              {request.order.confirmedAmountCad && ` — $${Number(request.order.confirmedAmountCad).toFixed(2)}`}
            </p>
            {request.order.scheduledFor && <p className="text-xs text-gray-500 dark:text-slate-400">Scheduled: {new Date(request.order.scheduledFor).toLocaleString("en-CA")}</p>}
            {request.order.expenseId && <p className="text-xs text-green-600">Expense recorded in Finance</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quotes */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quotes ({request.quotes.length})</h2>
          </div>
          {request.quotes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No quotes yet — add one from the vendor rankings</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {request.quotes.map((quote) => (
                <div key={quote.id} className={`px-4 py-3 ${quote.isSelected ? "bg-green-50 dark:bg-green-900/10" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {quote.isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{quote.vendor.name}</p>
                        {quote.isManualEntry && <span className="text-xs text-gray-400">(manual)</span>}
                      </div>
                      {quote.vendor.city && <p className="text-xs text-gray-500 dark:text-slate-400">{quote.vendor.city}</p>}
                      {quote.dietaryFit && <p className="text-xs text-[#1D9E75] mt-0.5">{quote.dietaryFit}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">${Number(quote.totalAmountCad).toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">${Number(quote.pricePerHead).toFixed(2)}/head</p>
                    </div>
                  </div>
                  {!request.order && !quote.isSelected && (
                    <button
                      onClick={() => selectQuote(quote.id)}
                      disabled={selectingQuote !== null}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded text-xs font-medium hover:bg-[#0A2342]/90 disabled:opacity-50"
                    >
                      {selectingQuote === quote.id ? "Confirming..." : "Select & Confirm Order"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranked vendors */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recommended Vendors</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Ranked by price, reliability, lead time & fit</p>
          </div>
          {ranked.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No vendors in network yet</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {ranked.slice(0, 5).map((rv, i) => (
                <div key={rv.vendor.id}>
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                    onClick={() => setShowQuoteForm(showQuoteForm === rv.vendor.id ? null : rv.vendor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{rv.vendor.name}</p>
                        </div>
                        {rv.vendor.city && <p className="text-xs text-gray-500 dark:text-slate-400">{rv.vendor.city}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#0A2342] dark:text-white">{rv.score.totalScore}</p>
                        {rv.estimatedPricePerHead != null && <p className="text-xs text-gray-500">${rv.estimatedPricePerHead.toFixed(2)}/head</p>}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <ScoreBar label="Price" value={rv.score.priceScore} weight="30%" />
                      <ScoreBar label="Reliability" value={rv.score.reliabilityScore} weight="25%" />
                      <ScoreBar label="Lead time" value={rv.score.leadTimeScore} weight="15%" />
                    </div>
                  </div>
                  {showQuoteForm === rv.vendor.id && (
                    <div className="px-4 pb-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mt-3 mb-2">Add quote from {rv.vendor.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Total ($) *</label>
                          <input type="number" value={quoteForm.totalAmountCad} onChange={(e) => setQuoteForm((f) => ({ ...f, totalAmountCad: e.target.value }))} placeholder="250.00" className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Per head ($)</label>
                          <input type="number" value={quoteForm.pricePerHead} onChange={(e) => setQuoteForm((f) => ({ ...f, pricePerHead: e.target.value }))} placeholder="auto" className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Lead time (days)</label>
                          <input type="number" value={quoteForm.leadTimeDays} onChange={(e) => setQuoteForm((f) => ({ ...f, leadTimeDays: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Dietary fit</label>
                          <input type="text" value={quoteForm.dietaryFit} onChange={(e) => setQuoteForm((f) => ({ ...f, dietaryFit: e.target.value }))} placeholder="e.g. vegan options available" className="w-full mt-0.5 px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]" />
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={quoteForm.includesDelivery} onChange={(e) => setQuoteForm((f) => ({ ...f, includesDelivery: e.target.checked }))} className="rounded" />
                        Includes delivery
                      </label>
                      <button
                        onClick={() => addQuote(rv.vendor.id)}
                        disabled={submittingQuote}
                        className="mt-2 w-full px-3 py-1.5 bg-[#0A2342] text-white rounded text-xs font-medium hover:bg-[#0A2342]/90 disabled:opacity-50"
                      >
                        {submittingQuote ? "Adding..." : "Add Quote"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
