"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Calendar, CheckCircle, Clock, XCircle, Truck } from "lucide-react";
import { PrintJobStatus } from "@prisma/client";

type Bid = {
  id: string;
  price: number;
  turnaround: number;
  notes: string | null;
  isAccepted: boolean;
  createdAt: string;
  job: {
    id: string;
    title: string;
    productType: string;
    quantity: number;
    deadline: string | null;
    deliveryCity: string | null;
    deliveryPostal: string | null;
    status: PrintJobStatus;
    awardedBidId: string | null;
    trackingNumber: string | null;
    carrier: string | null;
    estimatedDelivery: string | null;
  };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  won: { label: "Won", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-600 bg-amber-50" },
  lost: { label: "Lost", icon: XCircle, color: "text-gray-400 bg-gray-50" },
  in_production: { label: "In Production", icon: Package, color: "text-blue-600 bg-blue-50" },
  shipped: { label: "Shipped", icon: Truck, color: "text-purple-600 bg-purple-50" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-700 bg-green-50" },
};

function getBidStatus(bid: Bid): string {
  if (bid.isAccepted) {
    const { status } = bid.job;
    if (["in_production", "shipped", "delivered"].includes(status)) return status;
    return "won";
  }
  if (bid.job.awardedBidId && !bid.isAccepted) return "lost";
  return "pending";
}

export default function VendorBidsPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/bids")
      .then((r) => r.json())
      .then((d) => {
        setBids(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 mb-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Bids</h1>
        <p className="text-gray-500 mt-1">{total} total {total === 1 ? "bid" : "bids"}</p>
      </div>

      {bids.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No bids yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Browse available jobs and submit your first bid.
          </p>
          <Link
            href="/vendor/jobs"
            className="inline-block mt-4 bg-[#1D9E75] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#17865f] transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => {
            const statusKey = getBidStatus(bid);
            const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;

            return (
              <Link
                key={bid.id}
                href={`/vendor/jobs/${bid.job.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between hover:border-gray-300 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{bid.job.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{bid.job.productType.replace(/_/g, " ")} · {bid.job.quantity.toLocaleString()} units</span>
                    {bid.job.deliveryCity && <span>{bid.job.deliveryCity}</span>}
                    {bid.job.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {new Date(bid.job.deadline).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {bid.isAccepted && bid.job.trackingNumber && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                      <Truck className="w-3.5 h-3.5" />
                      {bid.job.carrier ? `${bid.job.carrier}: ` : ""}
                      {bid.job.trackingNumber}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-gray-900">${bid.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bid.turnaround}d turnaround</p>
                  <span className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
