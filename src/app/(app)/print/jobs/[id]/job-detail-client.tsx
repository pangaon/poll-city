"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, Star, Truck, RotateCcw, X,
  FileText, DollarSign, Package, Info, AlertTriangle,
} from "lucide-react";
import { Button, Badge, Card, CardContent, CardHeader, Modal, Textarea, Input, Select } from "@/components/ui";
import { toast } from "sonner";

interface PrintShop {
  id: string;
  name: string;
  rating: number | null;
  reviewCount?: number;
  isVerified: boolean;
  provincesServed?: string[];
}

interface PrintBid {
  id: string;
  shopId: string;
  price: number;
  turnaround: number;
  notes: string | null;
  fileUrl: string | null;
  isAccepted: boolean;
  createdAt: string;
  shop: PrintShop;
}

interface PrintJob {
  id: string;
  productType: string;
  title: string;
  quantity: number;
  description: string | null;
  specs: Record<string, unknown> | null;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  paymentStatus: string | null;
  notes: string | null;
  deadline: string | null;
  fileUrl: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  createdAt: string;
  bids: PrintBid[];
  _count: { bids: number };
}

interface Props { jobId: string; campaignId: string; }

const STATUS_FLOW = ["posted", "bidding", "awarded", "in_production", "quality_check", "shipped", "delivered", "cancelled"];

const LABELS: Record<string, string> = {
  posted: "Posted",
  bidding: "Bidding",
  awarded: "Awarded",
  in_production: "In Production",
  quality_check: "Quality Check",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PRODUCT_LABELS: Record<string, string> = {
  door_hanger: "Door Hangers", lawn_sign: "Lawn Signs", flyer: "Flyers",
  palm_card: "Palm Cards", mailer_postcard: "Postcards", banner: "Banners",
  button_pin: "Buttons", window_sign: "Window Clings", bumper_sticker: "Bumper Stickers",
  t_shirt: "T-Shirts", hat: "Hats", tote_bag: "Tote Bags",
  yard_stake: "Yard Stakes", table_cover: "Table Covers", lanyard: "Lanyards",
};

const PAYMENT_LABELS: Record<string, { label: string; variant: "default" | "info" | "warning" | "success" | "danger" }> = {
  pending: { label: "Payment Pending", variant: "warning" },
  paid: { label: "Paid", variant: "info" },
  released: { label: "Released to Shop", variant: "success" },
  refunded: { label: "Refunded", variant: "default" },
};

export default function JobDetailClient({ jobId }: Props) {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [awardConfirm, setAwardConfirm] = useState<PrintBid | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [proofFeedback, setProofFeedback] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("Canada Post");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [busy, setBusy] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/print/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load job");
      setJob(data.data);
      setTrackingNumber(data.data.trackingNumber || "");
      setCarrier(data.data.carrier || "Canada Post");
      setEstimatedDelivery(data.data.estimatedDelivery ? data.data.estimatedDelivery.slice(0, 10) : "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const acceptedBid = useMemo(() => job?.bids.find((b) => b.isAccepted) ?? null, [job]);

  async function patchJob(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/print/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setJob(data.data);
      toast.success("Job updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function awardBid() {
    if (!awardConfirm) return;
    await patchJob({ awardedBidId: awardConfirm.id });
    setAwardConfirm(null);
  }

  async function approveProof() {
    await patchJob({ status: "in_production", notes: "Proof approved" });
  }

  async function requestProofChanges() {
    if (!proofFeedback.trim()) { toast.error("Enter feedback before requesting changes"); return; }
    await patchJob({ status: "quality_check", notes: `Proof changes requested: ${proofFeedback}` });
    setProofFeedback("");
  }

  async function saveTracking() {
    await patchJob({ status: "shipped", trackingNumber, carrier, estimatedDelivery });
  }

  async function markDelivered() {
    await fetch("/api/print/payment/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    await patchJob({ status: "delivered" });
  }

  async function cancelJob() {
    await patchJob({ status: "cancelled", notes: cancelReason.trim() || "Cancelled" });
    setCancelOpen(false);
    setCancelReason("");
  }

  if (loading) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  if (!job) return <div className="text-sm text-gray-500">Job not found.</div>;

  const currentIdx = STATUS_FLOW.indexOf(job.status);
  const isCancellable = !["delivered", "cancelled"].includes(job.status);
  const specs = job.specs as Record<string, unknown> | null;

  // Build a human-readable activity timeline from status flow
  const timeline: Array<{ label: string; done: boolean; current: boolean }> = STATUS_FLOW
    .filter((s) => s !== "cancelled")
    .map((s, idx) => ({
      label: LABELS[s],
      done: idx < currentIdx && job.status !== "cancelled",
      current: s === job.status,
    }));

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/print/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-500">
              {PRODUCT_LABELS[job.productType] ?? job.productType} · {job.quantity.toLocaleString()} units
              {job.deadline && ` · Due ${new Date(job.deadline).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {isCancellable && (
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelOpen(true)}>
            <X className="w-4 h-4 mr-1" />Cancel Job
          </Button>
        )}
      </div>

      {/* Status pipeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            {job.status === "cancelled" ? (
              <Badge variant="danger">Cancelled</Badge>
            ) : (
              timeline.map(({ label, done, current }, idx) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-emerald-600 text-white" : current ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </span>
                  <span className={`text-xs ${current ? "font-semibold text-gray-900" : "text-gray-500"}`}>{label}</span>
                  {idx < timeline.length - 1 && <span className="text-gray-300 text-xs">›</span>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job specs */}
      {specs && Object.keys(specs).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold">Job Specifications</h3>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {!!specs.size && <><dt className="text-gray-500">Size</dt><dd className="font-medium col-span-1">{String(specs.size)}</dd></>}
              {!!specs.stock && <><dt className="text-gray-500">Stock</dt><dd className="font-medium">{String(specs.stock)}</dd></>}
              {!!specs.turnaround && <><dt className="text-gray-500">Turnaround</dt><dd className="font-medium capitalize">{String(specs.turnaround)}</dd></>}
              {specs.doubleSided !== undefined && <><dt className="text-gray-500">Sides</dt><dd className="font-medium">{!!specs.doubleSided ? "Double sided" : "Single sided"}</dd></>}
              {!!specs.coatingUV && <><dt className="text-gray-500">Coating</dt><dd className="font-medium">UV gloss</dd></>}
              {!!specs.coatingMatte && <><dt className="text-gray-500">Coating</dt><dd className="font-medium">Matte</dd></>}
              {!!specs.designMethod && <><dt className="text-gray-500">Design</dt><dd className="font-medium capitalize">{String(specs.designMethod).replace("_", " ")}</dd></>}
              {!!specs.totalPrice && <><dt className="text-gray-500">Est. Total</dt><dd className="font-medium text-emerald-700">${Number(specs.totalPrice).toLocaleString()}</dd></>}
              {!!specs.unitPrice && <><dt className="text-gray-500">Est. Unit</dt><dd className="font-medium">${Number(specs.unitPrice).toFixed(2)}</dd></>}
            </dl>
            {job.description && <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{job.description}</p>}
            {(job.deliveryAddress || job.deliveryCity) && (
              <p className="mt-2 text-xs text-gray-500">
                <Package className="w-3 h-3 inline mr-1" />
                Deliver to: {[job.deliveryAddress, job.deliveryCity, job.deliveryPostal].filter(Boolean).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice / awarded bid summary */}
      {acceptedBid && (
        <Card className="border-emerald-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold">Invoice</h3>
              </div>
              {job.paymentStatus && PAYMENT_LABELS[job.paymentStatus] && (
                <Badge variant={PAYMENT_LABELS[job.paymentStatus].variant}>
                  {PAYMENT_LABELS[job.paymentStatus].label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Shop</p>
                <p className="font-semibold">{acceptedBid.shop.name}</p>
                {acceptedBid.shop.isVerified && <Badge variant="success" className="mt-1">Verified</Badge>}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Total</p>
                <p className="text-2xl font-bold text-gray-900">${acceptedBid.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500">${(acceptedBid.price / Math.max(job.quantity, 1)).toFixed(2)} / unit</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Turnaround</p>
                <p className="font-medium">{acceptedBid.turnaround} days</p>
              </div>
              {(job.budgetMin || job.budgetMax) && (
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Budget</p>
                  <p className="font-medium">
                    {job.budgetMin && job.budgetMax
                      ? `$${job.budgetMin}–$${job.budgetMax}`
                      : job.budgetMax ? `$${job.budgetMax}` : `$${job.budgetMin}`}
                  </p>
                  {job.budgetMax && acceptedBid.price > job.budgetMax && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />Over budget by ${(acceptedBid.price - job.budgetMax).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            {acceptedBid.fileUrl && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Design file</p>
                <a href={acceptedBid.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline flex items-center gap-1">
                  <FileText className="w-3 h-3" />View proof / design file
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bids */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Bids ({job._count.bids})</h2>
        <div className="space-y-3">
          {job.bids.map((bid) => (
            <Card key={bid.id} className={bid.isAccepted ? "border-emerald-400" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{bid.shop.name}</p>
                      {bid.shop.isVerified && <Badge variant="success">Verified</Badge>}
                      {bid.isAccepted && <Badge variant="success">Awarded</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{bid.shop.provincesServed?.join(", ") || "Canada"}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{bid.shop.rating?.toFixed(1) || "New"}</p>
                    <p className="text-sm mt-1">{bid.notes || "No shop message"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${bid.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Per unit ${(bid.price / Math.max(job.quantity, 1)).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Turnaround {bid.turnaround} days</p>
                    <Badge variant="info" className="mt-1">Proof: {bid.fileUrl ? "Yes" : "No"}</Badge>
                    {!bid.isAccepted && ["posted", "bidding"].includes(job.status) && (
                      <Button size="sm" className="mt-2" onClick={() => setAwardConfirm(bid)}>Award This Bid</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {job.bids.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">No bids yet. Shops will submit quotes after reviewing your job specs.</p>
          )}
        </div>
      </div>

      {/* Proof approval */}
      {job.status === "awarded" && (
        <Card>
          <CardHeader><h3 className="font-semibold">Proof Approval</h3></CardHeader>
          <CardContent className="space-y-3">
            {acceptedBid?.fileUrl
              ? <img src={acceptedBid.fileUrl} alt="Proof" className="rounded-lg border border-gray-200 max-h-64 object-contain" />
              : <p className="text-sm text-gray-500">No proof uploaded by the shop yet.</p>
            }
            <div className="flex gap-2">
              <Button onClick={approveProof} loading={busy}>Approve Proof → Production</Button>
              <Button variant="outline" onClick={requestProofChanges} loading={busy}>Request Changes</Button>
            </div>
            <Textarea rows={3} value={proofFeedback} onChange={(e) => setProofFeedback(e.target.value)} placeholder="Describe the changes you need…" />
          </CardContent>
        </Card>
      )}

      {/* Delivery tracking */}
      {["in_production", "quality_check", "shipped"].includes(job.status) && (
        <Card>
          <CardHeader><h3 className="font-semibold">Delivery Tracking</h3></CardHeader>
          <CardContent className="space-y-3">
            {job.trackingNumber && (
              <p className="text-sm text-emerald-700 font-medium">
                <Truck className="w-4 h-4 inline mr-1" />
                {job.carrier}: {job.trackingNumber}
                {job.estimatedDelivery && ` — Est. ${new Date(job.estimatedDelivery).toLocaleDateString()}`}
              </p>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" />
              <Select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                <option>Canada Post</option>
                <option>UPS</option>
                <option>FedEx</option>
                <option>Purolator</option>
              </Select>
              <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveTracking} loading={busy}><Truck className="w-4 h-4 mr-1" />Save Tracking</Button>
              <Button onClick={markDelivered} loading={busy}>Mark as Delivered</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reorder */}
      {job.status === "delivered" && (
        <Link href={`/print/jobs/new?product=${job.productType.replace(/_/g, "-")}`}>
          <Button variant="outline"><RotateCcw className="w-4 h-4 mr-1" />Reorder Same Product</Button>
        </Link>
      )}

      {/* Notes */}
      {job.notes && (
        <Card>
          <CardHeader><h3 className="font-semibold text-sm text-gray-600">Activity Notes</h3></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-line">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Award bid modal */}
      <Modal open={!!awardConfirm} onClose={() => setAwardConfirm(null)} title="Award this bid?">
        {awardConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Award <strong>{awardConfirm.shop.name}</strong> for <strong>${awardConfirm.price.toFixed(2)}</strong>?</p>
            <p className="text-xs text-gray-500">A finance expense will be auto-posted to your campaign budget.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAwardConfirm(null)}>Cancel</Button>
              <Button onClick={awardBid} loading={busy}>Confirm Award</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this job?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will cancel the job and notify any bidding shops.
            {acceptedBid && " If already awarded, contact the shop about any work already started."}
          </p>
          <Textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Job</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={cancelJob}
              loading={busy}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
