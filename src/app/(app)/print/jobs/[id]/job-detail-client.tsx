"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Star, Truck, RotateCcw } from "lucide-react";
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
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
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

export default function JobDetailClient({ jobId }: Props) {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [awardConfirm, setAwardConfirm] = useState<PrintBid | null>(null);
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

  useEffect(() => {
    loadJob();
  }, [loadJob]);

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

  if (loading) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  if (!job) return <div className="text-sm text-gray-500">Job not found.</div>;

  const currentIdx = STATUS_FLOW.indexOf(job.status);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start gap-3">
        <Link href="/print/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          <p className="text-sm text-gray-500">{job.quantity.toLocaleString()} units</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FLOW.map((status, idx) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx <= currentIdx ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {idx < currentIdx ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </span>
                <span className={`text-xs ${idx === currentIdx ? "font-semibold text-gray-900" : "text-gray-500"}`}>{LABELS[status]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Bids</h2>
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
                    <Badge variant="info" className="mt-1">Proof included: {bid.fileUrl ? "Yes" : "No"}</Badge>
                    {!bid.isAccepted && ["posted", "bidding"].includes(job.status) && (
                      <Button size="sm" className="mt-2" onClick={() => setAwardConfirm(bid)}>Award This Bid</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {job.bids.length === 0 && <p className="text-sm text-gray-500">No bids yet.</p>}
        </div>
      </div>

      {job.status === "awarded" && (
        <Card>
          <CardHeader><h3 className="font-semibold">Proof Approval</h3></CardHeader>
          <CardContent className="space-y-3">
            {acceptedBid?.fileUrl ? <img src={acceptedBid.fileUrl} alt="Proof" className="rounded-lg border border-gray-200" /> : <p className="text-sm text-gray-500">No proof uploaded yet.</p>}
            <div className="flex gap-2">
              <Button onClick={approveProof} loading={busy}>Approve Proof</Button>
              <Button variant="outline" onClick={requestProofChanges} loading={busy}>Request Changes</Button>
            </div>
            <Textarea rows={3} value={proofFeedback} onChange={(e) => setProofFeedback(e.target.value)} placeholder="Requested proof changes..." />
          </CardContent>
        </Card>
      )}

      {["in_production", "quality_check", "shipped"].includes(job.status) && (
        <Card>
          <CardHeader><h3 className="font-semibold">Tracking</h3></CardHeader>
          <CardContent className="space-y-3">
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

      {job.status === "delivered" && (
        <Link href={`/print/jobs/new?product=${job.productType.replace(/_/g, "-")}`}>
          <Button variant="outline"><RotateCcw className="w-4 h-4 mr-1" />Reorder</Button>
        </Link>
      )}

      <Modal open={!!awardConfirm} onClose={() => setAwardConfirm(null)} title="Award this bid?">
        {awardConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Award <strong>{awardConfirm.shop.name}</strong> for <strong>${awardConfirm.price.toFixed(2)}</strong>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAwardConfirm(null)}>Cancel</Button>
              <Button onClick={awardBid} loading={busy}>Confirm Award</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
