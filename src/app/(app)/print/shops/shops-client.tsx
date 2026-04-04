"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, CheckCircle2, Clock3, MapPin, Building2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, PageHeader } from "@/components/ui";

interface PrintShop {
  id: string;
  name: string;
  email: string;
  city?: string;
  province?: string;
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  specialties: string[];
  provincesServed: string[];
  averageResponseHours: number | null;
  stripeOnboarded: boolean;
}

export default function PrintShopsClient() {
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/print/shops${q}`);
    const data = await res.json();
    setShops(data.data || []);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Print Shop Directory"
        description="Compare verified vendors, ratings, specialties, and response performance."
        actions={<Link href="/print/shops/register"><Button><Building2 className="w-4 h-4 mr-2" />Register as Print Shop</Button></Link>}
      />

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search print shops" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shops.map((shop) => (
          <Card key={shop.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                {shop.isVerified && <Badge variant="success">Verified</Badge>}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{shop.provincesServed?.join(", ") || "Canada"}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{shop.rating?.toFixed(1) || "New"} ({shop.reviewCount})</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Clock3 className="w-3 h-3" />Avg response: {shop.averageResponseHours ?? 24} hours</p>
              <div className="flex flex-wrap gap-1">
                {shop.specialties.slice(0, 6).map((s) => <Badge key={s} variant="info">{s.replace(/_/g, " ")}</Badge>)}
              </div>
              <div className="text-xs text-gray-500">Onboarding: {shop.stripeOnboarded ? <span className="text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connected</span> : "Pending"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
