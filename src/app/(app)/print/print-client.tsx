"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Flag, DoorOpen, FileText, CreditCard, Mail, Sticker, Circle,
  Shirt, HardHat, ShoppingBag, Scroll, Square, Anchor, RectangleHorizontal,
  Tag, Paintbrush, Store, Briefcase, LayoutTemplate, Sparkles,
  MapPin, Users, CalendarDays, PhoneCall, Receipt, ChevronRight,
  Boxes, Package,
} from "lucide-react";
import { PRINT_PRODUCTS, type ProductSpec } from "@/lib/print/catalog";
import { Button, Badge } from "@/components/ui";

/* ─── Operational print links ────────────────────────────────────────────────── */

const OPERATIONAL_LINKS: {
  label: string;
  description: string;
  href: string;
  Icon: React.ElementType;
}[] = [
  {
    label: "Walk List",
    description: "Contacts organised by street for door-to-door canvassing",
    href: "/canvassing/print-walk-list",
    Icon: MapPin,
  },
  {
    label: "Volunteer Schedule",
    description: "Weekly volunteer shift schedule for your team",
    href: "/volunteers?view=schedule&print=1",
    Icon: Users,
  },
  {
    label: "Event Sign-in Sheet",
    description: "Attendance sheet for campaign events",
    href: "/events?print=1",
    Icon: CalendarDays,
  },
  {
    label: "Call List",
    description: "Phone banking contact list formatted for callers",
    href: "/contacts?format=call&print=1",
    Icon: PhoneCall,
  },
  {
    label: "Expense Report",
    description: "Campaign expense summary for compliance filing",
    href: "/budget?print=1",
    Icon: Receipt,
  },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Flag, DoorOpen, FileText, CreditCard, Mail, Sticker, Circle,
  Shirt, HardHat, ShoppingBag, Scroll, Square, Anchor, RectangleHorizontal, Tag,
};

interface Props {
  campaignId: string;
}

function ProductCard({ product, idx }: { product: ProductSpec; idx: number }) {
  const Icon = ICON_MAP[product.icon] || Flag;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.3 }}
    >
      <Link href={`/print/products/${product.id}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer h-full min-h-[11rem]"
        >
          <div
            className={`h-11 w-11 rounded-lg bg-gradient-to-br ${product.heroClass} flex items-center justify-center mb-3`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-[#0A2342] text-sm leading-tight">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.summary}</p>
          <div className="flex items-center justify-between mt-3 gap-1">
            <span className="text-xs font-semibold text-[#1D9E75]">From {product.startingPrice}</span>
            <Badge variant="default">{product.turnaround.replace("Standard ", "").replace("Economy ", "")}</Badge>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function PrintClient({ campaignId }: Props) {
  const [brandApplied, setBrandApplied] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      {/* Hero */}
      <header
        className="rounded-2xl p-6 md:p-10 text-white mb-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A2342 0%, #1D9E75 100%)" }}
      >
        <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">Poll City Print</p>
        <h1 className="text-2xl md:text-4xl font-extrabold mt-1">Print Marketplace</h1>
        <p className="text-emerald-100 mt-2 md:mt-3 text-sm md:text-base max-w-xl">
          Campaign materials from lawn signs to lanyards. Select a product, post a job, and
          local print shops compete for your business.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setBrandApplied(true)}
              className="bg-white text-[#0A2342] hover:bg-emerald-50 font-bold h-11 px-5"
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              {brandApplied ? "Brand Kit Applied" : "Apply My Brand Kit"}
              {brandApplied && <Sparkles className="w-4 h-4 ml-1 text-[#1D9E75]" />}
            </Button>
          </motion.div>
          <Link href="/print/jobs/new">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 h-11 px-5">
                <Briefcase className="w-4 h-4 mr-2" />
                New Print Job
              </Button>
            </motion.div>
          </Link>
        </div>
      </header>

      {brandApplied && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 rounded-xl border border-[#1D9E75]/30 bg-emerald-50 p-4"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#1D9E75] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0A2342]">Brand Kit applied to all templates</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Your campaign name, colours, logo, and tagline will auto-fill on every design.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Campaign Operations — operational print links */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[#0A2342] mb-1">Campaign Operations</h2>
        <p className="text-xs text-gray-500 mb-4">Print directly from your campaign data — no shop order needed.</p>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {OPERATIONAL_LINKS.map(({ label, description, href, Icon }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ backgroundColor: "#f9fafb" }}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0A2342]/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#0A2342]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A2342]">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Product Grid — 15 categories */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[#0A2342] mb-4">15 Product Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRINT_PRODUCTS.map((product, idx) => (
            <ProductCard key={product.id} product={product} idx={idx} />
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-10">
        <Link href="/print/inventory">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border-2 border-[#1D9E75]/40 bg-emerald-50 p-5 hover:shadow-md transition-shadow"
          >
            <Boxes className="w-8 h-8 text-[#1D9E75] mb-2" />
            <h3 className="font-bold text-[#0A2342]">Inventory</h3>
            <p className="text-xs text-gray-500 mt-1">Track all printed materials</p>
          </motion.div>
        </Link>
        <Link href="/print/packs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border-2 border-[#0A2342]/20 bg-[#0A2342]/5 p-5 hover:shadow-md transition-shadow"
          >
            <Package className="w-8 h-8 text-[#0A2342] mb-2" />
            <h3 className="font-bold text-[#0A2342]">Print Packs</h3>
            <p className="text-xs text-gray-500 mt-1">Auto-generate walk &amp; sign kits</p>
          </motion.div>
        </Link>
        <Link href="/print/jobs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
          >
            <Briefcase className="w-8 h-8 text-[#0A2342] mb-2" />
            <h3 className="font-bold text-[#0A2342]">Print Jobs</h3>
            <p className="text-xs text-gray-500 mt-1">Post jobs, review bids, award contracts</p>
          </motion.div>
        </Link>
        <Link href="/print/shops">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
          >
            <Store className="w-8 h-8 text-[#1D9E75] mb-2" />
            <h3 className="font-bold text-[#0A2342]">Shop Directory</h3>
            <p className="text-xs text-gray-500 mt-1">Browse local print shops</p>
          </motion.div>
        </Link>
        <Link href="/print/templates">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
          >
            <LayoutTemplate className="w-8 h-8 text-purple-600 mb-2" />
            <h3 className="font-bold text-[#0A2342]">Templates</h3>
            <p className="text-xs text-gray-500 mt-1">Pre-designed, auto-branded templates</p>
          </motion.div>
        </Link>
      </section>

      {/* Hidden campaignId for React key */}
      <div className="hidden">{campaignId}</div>
    </div>
  );
}
