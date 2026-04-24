import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { PrintJobStatus } from "@prisma/client";
import { Package, Clock, CheckCircle, TrendingUp, UserCircle, Globe, Zap, Star } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Vendor Dashboard — Poll City" };

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

const CATEGORY_LABELS: Record<string, string> = {
  print_shop:           "Print Shop",
  sign_crew:            "Sign Crew",
  video_production:     "Video Production",
  photography:          "Photography",
  graphic_design:       "Graphic Design",
  digital_advertising:  "Digital Ads",
  phone_banking:        "Phone Banking",
  canvassing_crew:      "Canvassing",
  campaign_manager:     "Campaign Mgr",
  financial_agent:      "Financial Agent",
  accountant:           "Accountant",
  election_lawyer:      "Election Law",
  polling_firm:         "Polling",
  opposition_research:  "Opp Research",
  event_planning:       "Events",
  translation_services: "Translation",
  speaking_coach:       "Speaking Coach",
  media_trainer:        "Media Training",
  mail_house:           "Mail House",
  merchandise:          "Merchandise",
  data_analytics:       "Data & Analytics",
  website_tech:         "Web & Tech",
  other:                "Other",
};

export default async function VendorDashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;

  if (!session?.user || (role !== "PRINT_VENDOR" && role !== "VENDOR")) {
    redirect("/vendor/login");
  }

  const userId = (session.user as { id: string }).id;

  // ── VENDOR role — new unified vendor system ─────────────────────────────
  if (role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        printShop: {
          include: {
            bids: {
              include: {
                job: {
                  select: {
                    id: true, title: true, productType: true,
                    quantity: true, status: true, awardedBidId: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!vendor) redirect("/vendor/login");

    const isPrintVendor = vendor.printShop !== null;

    const [openJobs, bidCount, wonCount] = isPrintVendor
      ? await Promise.all([
          prisma.printJob.count({ where: { status: { in: ["posted", "bidding"] } } }),
          prisma.printBid.count({ where: { shopId: vendor.printShop!.id } }),
          prisma.printBid.count({ where: { shopId: vendor.printShop!.id, isAccepted: true } }),
        ])
      : [0, 0, 0];

    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {vendor.isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" /> Verified vendor
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Verification pending
              </span>
            )}
            {vendor.categories.map((cat) => (
              <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
            ))}
          </div>
        </div>

        {/* Print stats (only for vendors with print_shop category) */}
        {isPrintVendor && (
          <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
            {[
              { label: "Open Print Jobs", value: openJobs, icon: Package, color: "text-blue-600 bg-blue-50" },
              { label: "Bids Submitted", value: bidCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
              { label: "Jobs Won", value: wonCount, icon: CheckCircle, color: "text-green-600 bg-green-50" },
              {
                label: "Win Rate",
                value: bidCount > 0 ? `${Math.round((wonCount / bidCount) * 100)}%` : "—",
                icon: TrendingUp,
                color: "text-purple-600 bg-purple-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Profile is live card */}
        <div className="bg-gradient-to-r from-[#0A2342] to-[#0d2e54] rounded-xl p-6 mb-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#1D9E75]/20 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#1D9E75]" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-1">Your profile is live</h2>
              <p className="text-white/70 text-sm mb-3">
                Campaigns searching for{" "}
                {vendor.categories.slice(0, 2).map((c) => CATEGORY_LABELS[c] ?? c).join(", ")}
                {vendor.categories.length > 2 ? ` and ${vendor.categories.length - 2} more services` : ""}
                {" "}can find and contact you.
                {!vendor.isVerified && " Get verified to appear higher in search results."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/vendor/profile"
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <UserCircle className="w-3.5 h-3.5" /> Edit Profile
                </Link>
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Your Website
                  </a>
                )}
              </div>
            </div>
            {vendor.rating !== null && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-bold text-white text-lg">{vendor.rating.toFixed(1)}</span>
                </div>
                <div className="text-white/50 text-xs mt-0.5">Vendor rating</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent print bids (only for print vendors) */}
        {isPrintVendor && vendor.printShop && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Bids</h2>
            </div>
            {vendor.printShop.bids.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No bids submitted yet.</p>
                <p className="text-sm mt-1">Browse available print jobs to place your first bid.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {vendor.printShop.bids.map((bid) => (
                  <div key={bid.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{bid.job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {bid.job.productType.replace(/_/g, " ")} · Qty {bid.job.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${bid.price.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        bid.isAccepted ? "bg-green-100 text-green-700" :
                        bid.job.status === "cancelled" ? "bg-gray-100 text-gray-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {bid.isAccepted ? "Won" : STATUS_LABELS[bid.job.status] ?? bid.job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coming soon: job matching for non-print categories */}
        {!isPrintVendor && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center">
            <Zap className="w-8 h-8 mx-auto mb-3 text-[#1D9E75]" />
            <h3 className="font-semibold text-gray-900 mb-1">Campaign job matching coming soon</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Your profile is live and searchable now. Direct campaign job postings for{" "}
              {vendor.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(", ")} vendors are launching next.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Legacy PRINT_VENDOR path ────────────────────────────────────────────
  const shop = await prisma.printShop.findUnique({
    where: { userId },
    include: {
      bids: {
        include: {
          job: {
            select: {
              id: true, title: true, productType: true,
              quantity: true, deadline: true, status: true,
              awardedBidId: true, trackingNumber: true,
              carrier: true, estimatedDelivery: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!shop) redirect("/vendor/login");

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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    bid.isAccepted ? "bg-green-100 text-green-700" :
                    bid.job.status === "cancelled" ? "bg-gray-100 text-gray-500" :
                    "bg-amber-100 text-amber-700"
                  }`}>
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
