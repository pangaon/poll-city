"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, CheckCircle2, Clock3, MapPin, Building2, Search } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, EmptyState } from "@/components/ui";

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

export default function PrintShopsClient() {
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/print/shops${q}`);
      const data = await res.json();
      setShops(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search print shops by name, location, or specialty..."
          className="pl-10 h-11"
        />
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
          description={search ? "Try a different search term." : "Be the first to register your print shop."}
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
                  <div className="text-xs text-gray-500">
                    Payments: {shop.stripeOnboarded
                      ? <span className="text-[#1D9E75] inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connected</span>
                      : "Pending"}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
