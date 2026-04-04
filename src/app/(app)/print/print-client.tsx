"use client";
import Link from "next/link";
import { Printer, ArrowRight, Upload, FileText, Package, Star } from "lucide-react";
import { Button, Card, CardContent, CardHeader, PageHeader, Badge } from "@/components/ui";

interface Props { campaignId: string; }

const PRODUCTS = [
  {
    id: "door_hanger",
    name: "Door Hanger",
    icon: "🚪",
    description: "Classic door-to-door outreach. High-visibility format volunteers can place without knocking.",
    specs: ['4.25" × 11"', "Full color both sides", "14pt card stock", "Die-cut hole"],
    priceFrom: "$0.18",
    qty: "500–10,000",
    popular: true,
  },
  {
    id: "lawn_sign",
    name: "Lawn Sign",
    icon: "🪧",
    description: "High-impact yard signs that build name recognition throughout your ward.",
    specs: ['18" × 24" or 24" × 36"', "4mm corrugated coroplast", "UV-resistant ink", "H-stake included"],
    priceFrom: "$6.50",
    qty: "50–500",
    popular: true,
  },
  {
    id: "flyer",
    name: "Flyer",
    icon: "📄",
    description: "Versatile single-sheet handout for events, canvassing, and mail drops.",
    specs: ['8.5" × 11"', "Full color one or two sides", "60lb offset or 100lb gloss", "Bulk pricing"],
    priceFrom: "$0.08",
    qty: "250–5,000",
    popular: false,
  },
  {
    id: "palm_card",
    name: "Palm Card",
    icon: "✋",
    description: "Compact handout sized to fit in a pocket. Perfect for canvassing and events.",
    specs: ['3.5" × 8.5" or 4" × 9"', "Full color both sides", "14pt or 16pt card stock", "Rounded corners optional"],
    priceFrom: "$0.12",
    qty: "250–5,000",
    popular: false,
  },
  {
    id: "mailer_postcard",
    name: "Mailer / Postcard",
    icon: "✉️",
    description: "Addressed mail pieces targeting specific households in your riding.",
    specs: ['4" × 6" to 6" × 9"', "Full color both sides", "ORCA mail-ready", "Addressing service available"],
    priceFrom: "$0.55",
    qty: "200–5,000",
    popular: false,
  },
  {
    id: "banner",
    name: "Banner",
    icon: "🏳️",
    description: "Large-format vinyl banners for rallies, storefronts, and high-traffic areas.",
    specs: ['2\'×4\' to 4\'×8\'', "13oz vinyl", "Full color", "Hemmed + grommets"],
    priceFrom: "$45.00",
    qty: "1–20",
    popular: false,
  },
  {
    id: "button_pin",
    name: "Button / Pin",
    icon: "📌",
    description: "Wearable campaign buttons for volunteers and supporters.",
    specs: ['1.5" to 2.25" round', "Full color", "Safety-pin back", "Mylar coated"],
    priceFrom: "$0.35",
    qty: "100–2,000",
    popular: false,
  },
  {
    id: "window_sign",
    name: "Window Sign",
    icon: "🪟",
    description: "Indoor window displays for supporter homes, offices, and storefronts.",
    specs: ['8.5" × 11" to 17" × 22"', "Full color", "Static cling or paper", "Two-sided optional"],
    priceFrom: "$0.95",
    qty: "100–1,000",
    popular: false,
  },
];

export default function PrintClient({ campaignId }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Poll City Print"
        description="Order campaign materials from verified local print shops — post a job, receive competitive bids, and get delivered to your door."
        actions={
          <div className="flex gap-2">
            <Link href="/print/shops">
              <Button variant="outline" size="sm">Browse Shops</Button>
            </Link>
            <Link href="/print/jobs">
              <Button variant="outline" size="sm">My Jobs</Button>
            </Link>
            <Link href="/print/jobs/new">
              <Button size="sm">
                <Printer className="w-4 h-4" />
                New Print Job
              </Button>
            </Link>
          </div>
        }
      />

      {/* How it works */}
      <Card>
        <CardContent className="py-5">
          <div className="grid sm:grid-cols-4 gap-6 text-center">
            {[
              { step: "1", title: "Choose Product", desc: "Select from 8 campaign print formats" },
              { step: "2", title: "Post Your Job", desc: "Set quantity, deadline & budget" },
              { step: "3", title: "Receive Bids", desc: "Local shops quote within 24 hours" },
              { step: "4", title: "Award & Deliver", desc: "Accept the best bid, track delivery" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{step}</div>
                <p className="font-semibold text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Products</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PRODUCTS.map((p) => (
            <Card key={p.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-2xl">{p.icon}</span>
                  {p.popular && <Badge variant="info">Popular</Badge>}
                </div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                {/* Specs */}
                <ul className="space-y-0.5">
                  {p.specs.map((s) => (
                    <li key={s} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
                {/* Price */}
                <div className="flex items-baseline gap-1 text-sm">
                  <span className="font-semibold text-gray-900">From {p.priceFrom}</span>
                  <span className="text-xs text-gray-400">/ piece · {p.qty} qty</span>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <Link href={`/print/jobs/new?product=${p.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Start Designing
                    </Button>
                  </Link>
                  <Link href={`/print/jobs/new?product=${p.id}&upload=1`}>
                    <Button size="sm" variant="outline">
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/print/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">My Print Jobs</p>
                <p className="text-xs text-gray-500">Track orders and bids</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/print/shops">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Vendor Directory</p>
                <p className="text-xs text-gray-500">Browse verified print shops</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/print/jobs/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">New Print Job</p>
                <p className="text-xs text-gray-500">Post a job to the marketplace</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
