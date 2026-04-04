"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Star, MapPin, ArrowLeft, CheckCircle, Globe, Phone, Mail } from "lucide-react";
import { Button, Badge, Card, CardContent, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { toast } from "sonner";

interface PrintShop {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  serviceAreas: string[];
  specialties: string[];
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  logoUrl: string | null;
  _count: { bids: number };
}

const PRODUCT_LABELS: Record<string, string> = {
  door_hanger: "Door Hanger", lawn_sign: "Lawn Sign", flyer: "Flyer",
  palm_card: "Palm Card", mailer_postcard: "Mailer / Postcard",
  banner: "Banner", button_pin: "Button / Pin", window_sign: "Window Sign",
};

const SPECIALTIES = Object.entries(PRODUCT_LABELS);

export default function PrintShopsClient() {
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (specialty !== "all") params.set("specialty", specialty);
      const res = await fetch(`/api/print/shops?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load shops");
      setShops(data.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, specialty]);

  useEffect(() => { loadShops(); }, [loadShops]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/print">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <PageHeader
          title="Print Shop Directory"
          description="Verified local print shops serving Ontario campaigns"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search shops by name or service area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="sm:w-52"
        >
          <option value="all">All specialties</option>
          {SPECIALTIES.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </Select>
      </div>

      {/* Shop grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : shops.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No shops found"
              description={search || specialty !== "all"
                ? "Try adjusting your filters."
                : "No verified print shops are registered yet. Check back soon."}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="flex-1 flex flex-col gap-3 py-5">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-400">
                    {shop.logoUrl
                      ? <img src={shop.logoUrl} alt={shop.name} className="w-12 h-12 rounded-lg object-cover" />
                      : shop.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 truncate">{shop.name}</p>
                      {shop.isVerified && (
                        <span title="Verified"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" /></span>
                      )}
                    </div>
                    {shop.rating !== null && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-gray-700">{shop.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({shop.reviewCount} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {shop.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{shop.description}</p>
                )}

                {/* Service areas */}
                {shop.serviceAreas.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500">{shop.serviceAreas.join(", ")}</p>
                  </div>
                )}

                {/* Specialties */}
                {shop.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shop.specialties.slice(0, 4).map((s) => (
                      <Badge key={s} variant="default" className="text-xs">
                        {PRODUCT_LABELS[s] ?? s}
                      </Badge>
                    ))}
                    {shop.specialties.length > 4 && (
                      <Badge variant="default" className="text-xs">+{shop.specialties.length - 4}</Badge>
                    )}
                  </div>
                )}

                {/* Contact */}
                <div className="flex flex-col gap-1 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <a href={`mailto:${shop.email}`} className="hover:text-blue-600 truncate">{shop.email}</a>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${shop.phone}`} className="hover:text-blue-600">{shop.phone}</a>
                    </div>
                  )}
                  {shop.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <a href={shop.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 truncate">
                        {shop.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  {shop._count.bids} bid{shop._count.bids !== 1 ? "s" : ""} submitted
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
