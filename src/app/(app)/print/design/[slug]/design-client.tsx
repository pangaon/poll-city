"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, Palette, ArrowLeft, Printer } from "lucide-react";

interface Props {
  campaignId: string;
  campaignName: string;
  template: {
    id: string;
    slug: string;
    name: string;
    category: string;
    width: number;
    height: number;
  };
}

const QUANTITY_BREAKS: Record<string, Array<{ min: number; max: number; price: number }>> = {
  "lawn-sign": [
    { min: 1, max: 9, price: 12.99 },
    { min: 10, max: 24, price: 9.99 },
    { min: 25, max: 49, price: 7.99 },
    { min: 50, max: 99, price: 5.99 },
    { min: 100, max: 99999, price: 4.49 },
  ],
  "door-hanger": [
    { min: 100, max: 499, price: 0.45 },
    { min: 500, max: 999, price: 0.29 },
    { min: 1000, max: 4999, price: 0.19 },
    { min: 5000, max: 99999, price: 0.12 },
  ],
  flyer: [
    { min: 100, max: 499, price: 0.25 },
    { min: 500, max: 999, price: 0.15 },
    { min: 1000, max: 4999, price: 0.11 },
    { min: 5000, max: 99999, price: 0.09 },
  ],
  "palm-card": [{ min: 100, max: 999, price: 0.25 }, { min: 1000, max: 99999, price: 0.18 }],
  postcard: [{ min: 100, max: 999, price: 0.35 }, { min: 1000, max: 99999, price: 0.22 }],
  button: [{ min: 25, max: 99, price: 1.49 }, { min: 100, max: 499, price: 0.99 }, { min: 500, max: 99999, price: 0.89 }],
  sticker: [{ min: 50, max: 499, price: 0.59 }, { min: 500, max: 99999, price: 0.39 }],
};

function priceFor(category: string, qty: number): number {
  const breaks = QUANTITY_BREAKS[category];
  if (!breaks) return 0;
  const tier = breaks.find((b) => qty >= b.min && qty <= b.max) ?? breaks[breaks.length - 1];
  return qty * tier.price;
}

export default function DesignClient({ campaignId, template }: Props) {
  const [quantity, setQuantity] = useState(defaultQty(template.category));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(400);

  const total = priceFor(template.category, quantity);
  const previewUrl = `/api/print/preview/${template.slug}?campaignId=${campaignId}&t=${Date.now()}`;
  const downloadUrl = `/api/print/download/${template.slug}?campaignId=${campaignId}`;

  useEffect(() => {
    // Responsive aspect ratio — match template
    const aspect = template.height / template.width;
    const width = iframeRef.current?.parentElement?.clientWidth ?? 600;
    setIframeHeight(Math.min(900, width * aspect));
  }, [template.width, template.height]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/print"
          className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{template.name}</h1>
          <p className="text-xs text-slate-500">{template.width}" × {template.height}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-sm">
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Design preview"
              sandbox="allow-same-origin"
              className="w-full border border-slate-100 rounded-lg"
              style={{ height: iframeHeight }}
            />
          </div>
          <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900 flex items-start gap-2">
            <Palette className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Your Brand Kit is applied automatically.{" "}
              <Link href="/settings/brand" className="font-semibold underline">Update colours or logo →</Link>
            </span>
          </div>
        </div>

        {/* Order panel — sticky on desktop, inline on mobile */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4">
            <h2 className="font-bold text-slate-900">Get this printed</h2>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Quantity</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                className="mt-1.5 w-full h-12 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none tabular-nums"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {commonQtyOptions(template.category).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`h-9 px-3 rounded-full text-xs font-semibold border ${
                      quantity === q
                        ? "border-blue-600 bg-blue-100 text-blue-900"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {q.toLocaleString()}
                  </button>
                ))}
              </div>
            </label>

            <div className="border-t border-slate-200 pt-4 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">Estimated total</span>
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  ${total.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500">CAD, plus shipping and tax at checkout.</p>
            </div>

            <a
              href={downloadUrl}
              className="w-full h-12 rounded-lg border-2 border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download (free)
            </a>
            <button
              className="w-full h-12 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-800"
              disabled
              title="Fulfillment integration coming soon"
            >
              <Printer className="w-4 h-4" /> Order printing (soon)
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Download opens the design in your browser. Use File → Print → Save as PDF to get a print-ready file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultQty(category: string): number {
  if (category === "lawn-sign") return 25;
  if (category === "door-hanger") return 500;
  if (category === "flyer") return 500;
  if (category === "palm-card") return 500;
  if (category === "postcard") return 500;
  if (category === "button") return 100;
  if (category === "sticker") return 100;
  return 50;
}

function commonQtyOptions(category: string): number[] {
  if (category === "lawn-sign") return [10, 25, 50, 100, 250];
  if (category === "door-hanger") return [500, 1000, 2500, 5000];
  if (category === "flyer") return [250, 500, 1000, 2500];
  if (category === "palm-card" || category === "postcard") return [250, 500, 1000];
  if (category === "button") return [50, 100, 250, 500];
  if (category === "sticker") return [50, 100, 250, 500];
  return [25, 50, 100];
}
