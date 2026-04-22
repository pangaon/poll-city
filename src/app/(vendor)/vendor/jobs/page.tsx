"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Calendar, MapPin, DollarSign, ChevronRight } from "lucide-react";
import { PrintJobStatus, PrintProductType } from "@prisma/client";

type Job = {
  id: string;
  title: string;
  productType: PrintProductType;
  quantity: number;
  deadline: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  status: PrintJobStatus;
  budgetMin: number | null;
  budgetMax: number | null;
  _count: { bids: number };
  bids: { id: string; price: number; turnaround: number; isAccepted: boolean }[];
};

const PRODUCT_LABELS: Record<string, string> = {
  lawn_signs: "Lawn Signs",
  door_hangers: "Door Hangers",
  flyers: "Flyers",
  posters: "Posters",
  banners: "Banners",
  palm_cards: "Palm Cards",
  brochures: "Brochures",
  mailers: "Mailers",
  buttons: "Buttons",
  other: "Other",
};

export default function VendorJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendor/jobs")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 mb-4 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Available Jobs</h1>
        <p className="text-gray-500 mt-1">{total} open {total === 1 ? "job" : "jobs"} ready for bids</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No open jobs right now</p>
          <p className="text-sm text-gray-400 mt-1">Check back soon — campaigns post new jobs regularly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const myBid = job.bids[0];
            return (
              <Link
                key={job.id}
                href={`/vendor/jobs/${job.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between hover:border-[#1D9E75] hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{job.title}</span>
                    {myBid && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        Bid submitted: ${myBid.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {PRODUCT_LABELS[job.productType] ?? job.productType} · {job.quantity.toLocaleString()} units
                    </span>
                    {job.deliveryCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.deliveryCity}
                        {job.deliveryPostal ? ` ${job.deliveryPostal}` : ""}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due {new Date(job.deadline).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    {(job.budgetMin || job.budgetMax) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Budget: {job.budgetMin ? `$${job.budgetMin.toLocaleString()}` : ""}{job.budgetMin && job.budgetMax ? " – " : ""}
                        {job.budgetMax ? `$${job.budgetMax.toLocaleString()}` : ""}
                      </span>
                    )}
                    <span className="text-gray-400">{job._count.bids} {job._count.bids === 1 ? "bid" : "bids"}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1D9E75] mt-1 shrink-0 ml-4" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
