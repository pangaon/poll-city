"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, Clock3, MapPin, Building2, Search, Mail, ChevronDown, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, EmptyState, Modal } from "@/components/ui";

interface PrintShop {
  id: string;
  name: string;
  email: string;
  description?: string | null;
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  specialties: string[];
  provincesServed: string[];
  averageResponseHours: number | null;
  stripeOnboarded: boolean;
}

const PRODUCT_LABELS: Record<string, string> = {
  door_hanger: "Door Hangers",
  lawn_sign: "Lawn Signs",
  flyer: "Flyers",
  palm_card: "Palm Cards",
  mailer_postcard: "Postcards",
  banner: "Banners",
  button_pin: "Buttons",
  window_sign: "Window Clings",
  bumper_sticker: "Bumper Stickers",
  t_shirt: "T-Shirts",
  hat: "Hats",
  tote_bag: "Tote Bags",
  yard_stake: "Yard Stakes",
  table_cover: "Table Covers",
  lanyard: "Lanyards",
};

const PROVINCES = [
  { value: "ON", label: "Ontario" },
  { value: "BC", label: "British Columbia" },
  { value: "AB", label: "Alberta" },
  { value: "QC", label: "Quebec" },
  { value: "MB", label: "Manitoba" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland" },
  { value: "PE", label: "PEI" },
];

function QuoteModal({ shop, onClose }: { shop: PrintShop; onClose: () => void }) {
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSend = () => {
    const subject = encodeURIComponent(`Quote Request — ${product || "Campaign Print"}`);
    const body = encodeURIComponent(
      `Hello ${shop.name},\n\nI would like to request a quote for the following:\n\nProduct: ${product}\nQuantity: ${quantity}\nNotes: ${notes}\n\nPlease reply with pricing and turnaround time.\n\nThank you`
    );
    window.open(`mailto:${shop.email}?subject=${subject}&body=${body}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Request Quote — ${shop.name}`}>
      <div className="space-y-4 p-1">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Product type</label>
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select a product…</option>
            {Object.entries(PRODUCT_LABELS).map(([k, v]) => (
              <option key={k} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Quantity</label>
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Notes (sizes, specs, deadline)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requirements, file format, delivery deadline..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={!product}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Send Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function PrintShopsClient() {
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [quoteShop, setQuoteShop] = useState<PrintShop | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (province) params.set("province", province);
      if (specialty) params.set("specialty", specialty);
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/print/shops${q}`);
      const data = await res.json();
      setShops(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [search, province, specialty]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = province || specialty;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <header
        className="rounded-2xl p-6 md:p-10 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A2342 0%, #1D9E75 100%)" }}
      >
        <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">Poll City Print</p>
        <h1 className="text-2xl md:text-4xl font-extrabold mt-1">Print Shop Directory</h1>
        <p className="text-emerald-100 mt-2 text-sm md:text-base max-w-xl">
          Compare verified vendors, ratings, specialties, and response times.
        </p>
        <div className="mt-4">
          <Link href="/print/shops/register">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Button className="bg-white text-[#0A2342] hover:bg-emerald-50 font-bold h-11 px-5">
                <Building2 className="w-4 h-4 mr-2" />
                Register as Print Shop
              </Button>
            </motion.div>
          </Link>
        </div>
      </header>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, location, or specialty…"
            className="pl-10 h-11"
          />
        </div>
        <div className="relative">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none min-w-[140px]"
          >
            <option value="">All provinces</option>
            {PROVINCES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none min-w-[160px]"
          >
            <option value="">All products</option>
            {Object.entries(PRODUCT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={() => { setProvince(""); setSpecialty(""); }}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-48 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : shops.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10" />}
          title="No print shops found"
          description={search || hasFilters ? "Try adjusting your filters." : "Be the first to register your print shop."}
          action={
            <Link href="/print/shops/register">
              <Button>Register Your Shop</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop, idx) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className="h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0A2342]">{shop.name}</h3>
                    {shop.isVerified && <Badge variant="success">Verified</Badge>}
                  </div>
                  {shop.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{shop.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1D9E75]" />
                      {shop.provincesServed?.length ? shop.provincesServed.join(", ") : "Canada"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      {shop.rating?.toFixed(1) || "New"} ({shop.reviewCount} review{shop.reviewCount !== 1 ? "s" : ""})
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5 text-blue-500" />
                      Avg response: {shop.averageResponseHours ?? 24}h
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {shop.specialties.slice(0, 5).map((s) => (
                      <Badge key={s} variant="info">{PRODUCT_LABELS[s] || s.replace(/_/g, " ")}</Badge>
                    ))}
                    {shop.specialties.length > 5 && (
                      <Badge variant="default">+{shop.specialties.length - 5}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Payments: {shop.stripeOnboarded
                        ? <span className="text-[#1D9E75] inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connected</span>
                        : "Pending"}
                    </div>
                    <Button
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setQuoteShop(shop)}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Request Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {quoteShop && (
          <QuoteModal shop={quoteShop} onClose={() => setQuoteShop(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
