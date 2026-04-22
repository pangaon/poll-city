"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, UtensilsCrossed, Trophy, TrendingDown, Clock, Leaf } from "lucide-react";

interface ScoreBreakdown {
  priceScore: number; reliabilityScore: number; leadTimeScore: number;
  distanceScore: number; dietaryFitScore: number; partnershipScore: number; totalScore: number;
}

interface RankedVendor {
  vendor: { id: string; name: string; city: string | null; reliabilityScore: number; partnershipTier: number };
  score: ScoreBreakdown;
  estimatedPricePerHead: number | null;
}

const REQUEST_TYPES = [
  { value: "hq_daily", label: "HQ Daily" },
  { value: "event", label: "Event" },
  { value: "phone_bank", label: "Phone Bank" },
  { value: "canvassing", label: "Canvassing" },
  { value: "sign_crew", label: "Sign Crew" },
  { value: "volunteer_meal", label: "Volunteer Meal" },
  { value: "other", label: "Other" },
];

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = value >= 80 ? "bg-[#1D9E75]" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-slate-400 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 w-7 text-right">{value}</span>
      <span className="text-xs text-gray-400 w-8">{weight}</span>
    </div>
  );
}

export default function NewRequestClient({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [rankedVendors, setRankedVendors] = useState<RankedVendor[]>([]);
  const [showRankings, setShowRankings] = useState(false);
  const [form, setForm] = useState({
    requestType: "volunteer_meal",
    headcount: "",
    budgetCapCad: "",
    neededBy: "",
    location: "",
    notes: "",
    dietaryNotes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.headcount || !form.neededBy) { toast.error("Headcount and date required"); return; }
    setSaving(true);
    const res = await fetch("/api/fuel/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        requestType: form.requestType,
        headcount: parseInt(form.headcount),
        budgetCapCad: form.budgetCapCad ? parseFloat(form.budgetCapCad) : null,
        neededBy: new Date(form.neededBy).toISOString(),
        location: form.location || null,
        notes: form.notes || null,
        dietaryNotes: form.dietaryNotes || null,
      }),
    }).then((r) => r.json());
    setSaving(false);

    if (res.data) {
      if (res.rankedVendors?.length > 0) {
        setRankedVendors(res.rankedVendors);
        setShowRankings(true);
      } else {
        toast.success("Request created");
        router.push(`/fuel/requests/${res.data.id}`);
      }
    } else {
      toast.error(res.error ?? "Failed to create request");
    }
  }

  if (showRankings && rankedVendors.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Request Created</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Here are the top vendors ranked for this request</p>
        </div>
        <div className="space-y-3">
          {rankedVendors.map((rv, i) => (
            <div key={rv.vendor.id} className={`bg-white dark:bg-slate-900 border rounded-xl p-4 ${i === 0 ? "border-[#1D9E75] ring-1 ring-[#1D9E75]/20" : "border-gray-200 dark:border-slate-700"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {i === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">#{i + 1} {rv.vendor.name}</p>
                  </div>
                  {rv.vendor.city && <p className="text-xs text-gray-500 dark:text-slate-400">{rv.vendor.city}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#0A2342] dark:text-white">{rv.score.totalScore}</p>
                  <p className="text-xs text-gray-400">score</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <ScoreBar label="Price (30%)" value={rv.score.priceScore} weight="30%" />
                <ScoreBar label="Reliability (25%)" value={rv.score.reliabilityScore} weight="25%" />
                <ScoreBar label="Lead time (15%)" value={rv.score.leadTimeScore} weight="15%" />
                <ScoreBar label="Dietary fit (10%)" value={rv.score.dietaryFitScore} weight="10%" />
                <ScoreBar label="Partnership (10%)" value={rv.score.partnershipScore} weight="10%" />
              </div>
              {rv.estimatedPricePerHead != null && (
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  Est. <span className="font-medium text-gray-900 dark:text-white">${rv.estimatedPricePerHead.toFixed(2)}/head</span>
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Link href="/fuel/requests" className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm text-center hover:bg-gray-50 dark:hover:bg-slate-800">
            View all requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/fuel/requests" className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to requests
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Food Request</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">After creating, we&apos;ll rank available vendors automatically</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Request type *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {REQUEST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => set("requestType", t.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  form.requestType === t.value
                    ? "bg-[#0A2342] text-white border-[#0A2342]"
                    : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Headcount *</label>
            <input
              type="number"
              value={form.headcount}
              onChange={(e) => set("headcount", e.target.value)}
              placeholder="e.g. 25"
              min={1}
              className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Budget cap (CAD)</label>
            <input
              type="number"
              value={form.budgetCapCad}
              onChange={(e) => set("budgetCapCad", e.target.value)}
              placeholder="e.g. 300"
              min={0}
              step={0.01}
              className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Needed by *</label>
            <input
              type="datetime-local"
              value={form.neededBy}
              onChange={(e) => set("neededBy", e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Campaign HQ, 123 Main St"
              className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Dietary restrictions</label>
          <input
            type="text"
            value={form.dietaryNotes}
            onChange={(e) => set("dietaryNotes", e.target.value)}
            placeholder="e.g. 3 vegan, 2 halal, 1 gluten-free"
            className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Any additional details..."
            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342] resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/fuel/requests" className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm text-center hover:bg-gray-50 dark:hover:bg-slate-800">
          Cancel
        </Link>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Request & Rank Vendors"}
        </button>
      </div>
    </div>
  );
}
