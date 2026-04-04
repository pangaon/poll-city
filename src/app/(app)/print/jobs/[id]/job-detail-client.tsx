"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, Clock, Package, Star, ExternalLink,
  Send, AlertCircle, Truck, Archive
} from "lucide-react";
import { Button, Badge, Card, CardContent, CardHeader, Modal } from "@/components/ui";
import { toast } from "sonner";

interface PrintShop {
  id: string;
  name: string;
  rating: number | null;
  isVerified: boolean;
  specialties: string[];
  serviceAreas: string[];
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
  deadline: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  fileUrl: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  status: string;
  awardedBidId: string | null;
  notes: string | null;
  createdAt: string;
  bids: PrintBid[];
  _count: { bids: number };
}

interface Props { jobId: string; campaignId: string; }

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  posted: "Posted",
  bidding: "Bidding",
  awarded: "Awarded",
  in_production: "In Production",
  ready: "Ready for Pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  draft: "default",
  posted: "info",
  bidding: "warning",
  awarded: "success",
  in_production: "info",
  ready: "success",
  delivered: "success",
  cancelled: "danger",
};

const PRODUCT_LABELS: Record<string, string> = {
  door_hanger: "Door Hanger", lawn_sign: "Lawn Sign", flyer: "Flyer",
  palm_card: "Palm Card", mailer_postcard: "Mailer / Postcard",
  banner: "Banner", button_pin: "Button / Pin", window_sign: "Window Sign",
};

const STATUS_FLOW = ["draft", "posted", "bidding", "awarded", "in_production", "ready", "delivered"];

export default function JobDetailClient({ jobId, campaignId }: Props) {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [awardConfirm, setAwardConfirm] = useState<PrintBid | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/print/jobs/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load job");
      setJob(data.data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  async function postJob() {
    await updateStatus("posted");
  }

  async function updateStatus(status: string, extra: Record<string, unknown> = {}) {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/print/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setJob(data.data);
      toast.success("Status updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdvancing(false);
    }
  }

  async function awardBid(bid: PrintBid) {
    setAwardConfirm(null);
    setAdvancing(true);
    try {
      const res = await fetch(`/api/print/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardedBidId: bid.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Award failed");
      setJob(data.data);
      toast.success(`Bid awarded to ${bid.shop.name}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!job) return (
    <div className="text-center py-12 text-gray-500">Job not found.</div>
  );

  const currentStepIdx = STATUS_FLOW.indexOf(job.status);
  const nextStatus = STATUS_FLOW[currentStepIdx + 1] as string | undefined;

  const acceptedBid = job.bids.find((b) => b.isAccepted);

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/print/jobs">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            <Badge variant={STATUS_VARIANTS[job.status] ?? "default"}>
              {STATUS_LABELS[job.status] ?? job.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">
            {PRODUCT_LABELS[job.productType] ?? job.productType} · {job.quantity.toLocaleString()} units ·
            Created {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < currentStepIdx ? "bg-emerald-500 text-white" : i === currentStepIdx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {i < currentStepIdx ? "✓" : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i === currentStepIdx ? "font-semibold text-blue-600" : "text-gray-400"}`}>
                  {STATUS_LABELS[s]}
                </span>
                {i < STATUS_FLOW.length - 1 && <div className="w-6 h-px bg-gray-200 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><h3 className="font-semibold text-sm text-gray-700">Job Details</h3></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Product", PRODUCT_LABELS[job.productType] ?? job.productType],
              ["Quantity", job.quantity.toLocaleString()],
              ["Deadline", job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"],
              ["Budget", job.budgetMin || job.budgetMax
                ? `$${job.budgetMin ?? "?"} – $${job.budgetMax ?? "?"}`
                : "Not specified"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{value}</span>
              </div>
            ))}
            {job.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 text-xs mb-1">Description</p>
                <p className="text-gray-700">{job.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-sm text-gray-700">Delivery</h3></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(job.deliveryAddress || job.deliveryCity) ? (
              <p className="text-gray-700">
                {[job.deliveryAddress, job.deliveryCity, job.deliveryPostal].filter(Boolean).join(", ")}
              </p>
            ) : (
              <p className="text-gray-400">No delivery address set</p>
            )}
            {job.fileUrl && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Design File</p>
                <a href={job.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> View File
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {job.status === "draft" && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">This job is a draft</p>
              <p className="text-sm text-blue-700">Post it to the marketplace to start receiving bids from print shops.</p>
            </div>
            <Button onClick={postJob} loading={advancing} size="sm">
              <Send className="w-4 h-4" />Post Job
            </Button>
          </CardContent>
        </Card>
      )}

      {job.status === "awarded" && acceptedBid && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-emerald-900">Awarded to {acceptedBid.shop.name}</p>
              <p className="text-sm text-emerald-700">${acceptedBid.price} · {acceptedBid.turnaround} day turnaround</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => updateStatus("in_production")} loading={advancing}>
                <Package className="w-4 h-4" /> Mark In Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {job.status === "in_production" && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => updateStatus("ready")} loading={advancing}>
            <CheckCircle className="w-4 h-4" />Mark Ready
          </Button>
        </div>
      )}

      {job.status === "ready" && (
        <div className="flex gap-2">
          <Button onClick={() => updateStatus("delivered")} loading={advancing}>
            <Truck className="w-4 h-4" />Mark Delivered
          </Button>
        </div>
      )}

      {!["cancelled", "delivered"].includes(job.status) && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => updateStatus("cancelled")} loading={advancing} className="text-red-500 hover:text-red-600">
            <Archive className="w-4 h-4" />Cancel Job
          </Button>
        </div>
      )}

      {/* Bids */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">
            Bids {job._count.bids > 0 && <span className="text-gray-400 font-normal">({job._count.bids})</span>}
          </h2>
          {job.status === "bidding" && (
            <Badge variant="warning">Accepting bids</Badge>
          )}
        </div>

        {job.bids.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                {job.status === "draft" ? "Post this job to start receiving bids." :
                 job.status === "posted" ? "Waiting for shops to submit bids..." :
                 "No bids received."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {job.bids.map((bid) => (
              <Card key={bid.id} className={bid.isAccepted ? "border-emerald-300 bg-emerald-50/20" : ""}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{bid.shop.name}</p>
                      {bid.shop.isVerified && <Badge variant="success">Verified</Badge>}
                      {bid.isAccepted && <Badge variant="success">Accepted</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900 text-base">${bid.price.toFixed(2)}</span>
                      <span>·</span>
                      <span>{bid.turnaround} day{bid.turnaround !== 1 ? "s" : ""} turnaround</span>
                      {bid.shop.rating && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {bid.shop.rating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {bid.notes && <p className="text-xs text-gray-500 mt-1">{bid.notes}</p>}
                    {bid.fileUrl && (
                      <a href={bid.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" />View proof
                      </a>
                    )}
                  </div>
                  {!bid.isAccepted && ["posted", "bidding"].includes(job.status) && (
                    <Button
                      size="sm"
                      onClick={() => setAwardConfirm(bid)}
                    >
                      Award Bid
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Award confirmation modal */}
      <Modal open={!!awardConfirm} onClose={() => setAwardConfirm(null)} title="Award this bid?">
        {awardConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are awarding the job <strong>{job.title}</strong> to{" "}
              <strong>{awardConfirm.shop.name}</strong> for{" "}
              <strong>${awardConfirm.price.toFixed(2)}</strong>.
            </p>
            <p className="text-sm text-gray-500">
              {awardConfirm.turnaround}-day turnaround. Contact the shop directly to confirm payment and next steps.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAwardConfirm(null)}>Cancel</Button>
              <Button onClick={() => awardBid(awardConfirm)} loading={advancing}>
                <CheckCircle className="w-4 h-4" />Confirm Award
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
