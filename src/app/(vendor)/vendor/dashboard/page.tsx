import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { PrintJobStatus } from "@prisma/client";
import { Package, Clock, CheckCircle, TrendingUp } from "lucide-react";

export const metadata = { title: "Vendor Dashboard — Poll City Print" };

const STATUS_LABELS: Record<PrintJobStatus, string> = {
  draft: "Draft",
  posted: "Posted",
  bidding: "Bidding",
  awarded: "Awarded",
  in_production: "In Production",
  quality_check: "Quality Check",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function VendorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "PRINT_VENDOR") {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  const shop = await prisma.printShop.findUnique({
    where: { userId },
    include: {
      bids: {
        include: {
          job: {
            select: {
              id: true,
              title: true,
              productType: true,
              quantity: true,
              deadline: true,
              status: true,
              awardedBidId: true,
              trackingNumber: true,
              carrier: true,
              estimatedDelivery: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!shop) redirect("/login");

  const [openJobs, bidCount, wonCount] = await Promise.all([
    prisma.printJob.count({ where: { status: { in: ["posted", "bidding"] } } }),
    prisma.printBid.count({ where: { shopId: shop.id } }),
    prisma.printBid.count({ where: { shopId: shop.id, isAccepted: true } }),
  ]);

  const stats = [
    { label: "Open Jobs to Bid", value: openJobs, icon: Package, color: "text-blue-600 bg-blue-50" },
    { label: "Bids Submitted", value: bidCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Jobs Won", value: wonCount, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    {
      label: "Win Rate",
      value: bidCount > 0 ? `${Math.round((wonCount / bidCount) * 100)}%` : "—",
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
        <p className="text-gray-500 mt-1">
          {shop.isVerified ? "Verified vendor" : "Verification pending"} ·{" "}
          {shop.stripeOnboarded ? "Payments enabled" : "Stripe setup incomplete"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent bids */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Bids</h2>
        </div>
        {shop.bids.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No bids submitted yet.</p>
            <p className="text-sm mt-1">Browse available jobs to place your first bid.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shop.bids.map((bid) => (
              <div key={bid.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{bid.job.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bid.job.productType.replace(/_/g, " ")} · Qty {bid.job.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${bid.price.toLocaleString()}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      bid.isAccepted
                        ? "bg-green-100 text-green-700"
                        : bid.job.status === "cancelled"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {bid.isAccepted ? "Won" : STATUS_LABELS[bid.job.status] ?? bid.job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
