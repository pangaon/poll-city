"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Package, Calendar, MapPin, DollarSign, ArrowLeft, CheckCircle, Truck, AlertCircle } from "lucide-react";
import { PrintJobStatus } from "@prisma/client";

type Job = {
  id: string;
  title: string;
  productType: string;
  quantity: number;
  description: string | null;
  specs: Record<string, unknown> | null;
  deadline: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  notes: string | null;
  status: PrintJobStatus;
  awardedBidId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  _count: { bids: number };
  bids: { id: string; price: number; turnaround: number; isAccepted: boolean; notes: string | null }[];
};

type ProductionForm = {
  status: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
};

export default function VendorJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({ price: "", turnaround: "", notes: "" });
  const [prodForm, setProdForm] = useState<ProductionForm>({
    status: "",
    trackingNumber: "",
    carrier: "",
    estimatedDelivery: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/vendor/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const found: Job | null = d.data ?? null;
        setJob(found);
        if (found) {
          // Default to in_production when job is awarded (not yet started)
          const effectiveStatus = found.status === "awarded" ? "in_production" : found.status;
          setProdForm({
            status: effectiveStatus,
            trackingNumber: found.trackingNumber ?? "",
            carrier: found.carrier ?? "",
            estimatedDelivery: found.estimatedDelivery
              ? new Date(found.estimatedDelivery).toISOString().split("T")[0]
              : "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function submitBid() {
    if (!bidForm.price || !bidForm.turnaround) {
      setMessage({ type: "error", text: "Price and turnaround days are required." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/vendor/jobs/${id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: parseFloat(bidForm.price),
        turnaround: parseInt(bidForm.turnaround),
        notes: bidForm.notes || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to submit bid." });
    } else {
      setMessage({ type: "success", text: "Bid submitted successfully!" });
      router.refresh();
    }
  }

  async function saveProduction() {
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {};
    if (prodForm.status) body.status = prodForm.status;
    if (prodForm.trackingNumber) body.trackingNumber = prodForm.trackingNumber;
    if (prodForm.carrier) body.carrier = prodForm.carrier;
    if (prodForm.estimatedDelivery) body.estimatedDelivery = prodForm.estimatedDelivery;

    const res = await fetch(`/api/vendor/jobs/${id}/production`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to update production status." });
    } else {
      setMessage({ type: "success", text: "Production status updated." });
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">Job not found or no longer available.</p>
        </div>
      </div>
    );
  }

  const myBid = job.bids[0];
  const isAwarded = !!job.awardedBidId;
  const wonByMe = myBid?.isAccepted;
  const canBid = !myBid && (job.status === "posted" || job.status === "bidding");
  const canUpdateProduction = wonByMe && ["awarded", "in_production", "shipped"].includes(job.status);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to jobs
      </button>

      {/* Job card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {job.productType.replace(/_/g, " ")} · {job.quantity.toLocaleString()} units
          </span>
          {job.deliveryCity && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {[job.deliveryAddress, job.deliveryCity, job.deliveryPostal].filter(Boolean).join(", ")}
            </span>
          )}
          {job.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Due {new Date(job.deadline).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
          {(job.budgetMin || job.budgetMax) && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {job.budgetMin ? `$${job.budgetMin.toLocaleString()}` : ""}
              {job.budgetMin && job.budgetMax ? " – " : ""}
              {job.budgetMax ? `$${job.budgetMax.toLocaleString()}` : ""}
            </span>
          )}
        </div>
        {job.description && <p className="text-sm text-gray-700 mb-3">{job.description}</p>}
        {job.notes && <p className="text-sm text-gray-500 italic">{job.notes}</p>}
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
          {job._count.bids} {job._count.bids === 1 ? "bid" : "bids"} submitted
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* My existing bid */}
      {myBid && (
        <div
          className={`bg-white rounded-xl border p-6 mb-6 ${
            wonByMe ? "border-green-300 bg-green-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            {wonByMe ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Package className="w-5 h-5 text-amber-500" />
            )}
            <h2 className="font-semibold text-gray-900">
              {wonByMe ? "Your Bid Won" : "Your Bid"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Bid Price</p>
              <p className="font-semibold text-gray-900">${myBid.price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Turnaround</p>
              <p className="font-semibold text-gray-900">{myBid.turnaround} days</p>
            </div>
          </div>
          {myBid.notes && <p className="text-sm text-gray-600 mt-3">{myBid.notes}</p>}
        </div>
      )}

      {/* Submit bid form */}
      {canBid && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Submit Your Bid</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (CAD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 850.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={bidForm.price}
                  onChange={(e) => setBidForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turnaround (business days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={bidForm.turnaround}
                  onChange={(e) => setBidForm((p) => ({ ...p, turnaround: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                placeholder="Any details about your bid, materials, or production timeline…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
                value={bidForm.notes}
                onChange={(e) => setBidForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <button
              onClick={submitBid}
              disabled={saving}
              className="bg-[#1D9E75] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#17865f] transition-colors disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit Bid"}
            </button>
          </div>
        </div>
      )}

      {/* Production status update */}
      {canUpdateProduction && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-[#0A2342]" />
            <h2 className="font-semibold text-gray-900">Update Production Status</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                value={prodForm.status}
                onChange={(e) => setProdForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="in_production">In Production</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                <input
                  type="text"
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={prodForm.trackingNumber}
                  onChange={(e) => setProdForm((p) => ({ ...p, trackingNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                <input
                  type="text"
                  placeholder="e.g. Canada Post, FedEx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={prodForm.carrier}
                  onChange={(e) => setProdForm((p) => ({ ...p, carrier: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                value={prodForm.estimatedDelivery}
                onChange={(e) => setProdForm((p) => ({ ...p, estimatedDelivery: e.target.value }))}
              />
            </div>
            <button
              onClick={saveProduction}
              disabled={saving}
              className="bg-[#0A2342] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d2e54] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Production Update"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
