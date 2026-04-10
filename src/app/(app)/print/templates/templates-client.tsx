"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutTemplate, ArrowLeft, Crown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrintTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  width: number;
  height: number;
  thumbnail: string | null;
  isPremium: boolean;
}

interface Props {
  campaignId: string;
}

// ─── Pricing lookup ───────────────────────────────────────────────────────────

const PRICING: Record<string, { label: string; fromCad: number; turnaround: string }> = {
  "lawn-sign":     { label: "Lawn Signs",      fromCad: 4.49,  turnaround: "5–7 days" },
  "door-hanger":   { label: "Door Hangers",    fromCad: 0.12,  turnaround: "4–6 days" },
  flyer:           { label: "Flyers",           fromCad: 0.09,  turnaround: "3–5 days" },
  "palm-card":     { label: "Palm Cards",       fromCad: 0.18,  turnaround: "3–5 days" },
  postcard:        { label: "Postcards",        fromCad: 0.22,  turnaround: "3–5 days" },
  "mailer-postcard": { label: "Postcards",      fromCad: 0.22,  turnaround: "3–5 days" },
  "bumper-sticker":  { label: "Bumper Stickers", fromCad: 1.90, turnaround: "5–7 days" },
  "button-pin":    { label: "Buttons",          fromCad: 0.89,  turnaround: "5–7 days" },
  button:          { label: "Buttons",          fromCad: 0.89,  turnaround: "5–7 days" },
  sticker:         { label: "Stickers",         fromCad: 0.39,  turnaround: "3–5 days" },
  "t-shirt":       { label: "T-Shirts",         fromCad: 14.99, turnaround: "7–10 days" },
  hat:             { label: "Hats",             fromCad: 18.99, turnaround: "7–10 days" },
  "tote-bag":      { label: "Tote Bags",        fromCad: 11.99, turnaround: "7–10 days" },
  banner:          { label: "Banners",          fromCad: 45.00, turnaround: "7–14 days" },
};

const CATEGORY_ORDER = [
  "lawn-sign", "door-hanger", "flyer", "palm-card", "postcard",
  "mailer-postcard", "bumper-sticker", "button-pin", "button",
  "sticker", "t-shirt", "hat", "tote-bag", "banner",
];

// ─── Template thumbnail ───────────────────────────────────────────────────────
// CSS-scaled iframe so we get a real visual preview of the HTML template.
// The iframe is sized large (600px wide) then CSS-transformed to fit the card.

function TemplateThumbnail({
  slug,
  campaignId,
  width,
  height,
}: {
  slug: string;
  campaignId: string;
  width: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [containerH, setContainerH] = useState(150);
  const IFRAME_W = 600;
  const IFRAME_H = Math.round(IFRAME_W * (height / width));

  useEffect(() => {
    function calc() {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const s = cw / IFRAME_W;
      setScale(s);
      setContainerH(Math.round(IFRAME_H * s));
    }
    calc();
    const ro = new ResizeObserver(calc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [IFRAME_W, IFRAME_H]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden bg-slate-50 rounded-t-xl"
      style={{ height: containerH }}
    >
      <iframe
        src={`/api/print/preview/${slug}?campaignId=${campaignId}`}
        title={`${slug} preview`}
        sandbox="allow-same-origin"
        scrolling="no"
        className="border-0 pointer-events-none"
        style={{
          width: IFRAME_W,
          height: IFRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          display: "block",
        }}
      />
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  campaignId,
  idx,
}: {
  template: PrintTemplate;
  campaignId: string;
  idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.25 }}
    >
      <Link href={`/print/design/${template.slug}?campaignId=${campaignId}`}>
        <motion.div
          whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer group"
        >
          {/* Thumbnail */}
          <div className="relative">
            <TemplateThumbnail
              slug={template.slug}
              campaignId={campaignId}
              width={template.width}
              height={template.height}
            />
            {template.isPremium && (
              <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold">
                <Crown className="w-2.5 h-2.5" /> PRO
              </div>
            )}
          </div>
          {/* Card info */}
          <div className="p-3">
            <p className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-700 transition-colors">
              {template.name}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {template.width}&Prime; &times; {template.height}&Prime; &bull; Tap to customise →
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PrintTemplatesClient({ campaignId }: Props) {
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/print/templates")
      .then((r) => r.json())
      .then((d: { templates: PrintTemplate[] }) => setTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build category list from actual data
  const availableCategories = [
    "all",
    ...CATEGORY_ORDER.filter((c) => templates.some((t) => t.category === c)),
    ...templates
      .map((t) => t.category)
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .filter((c, i, arr) => arr.indexOf(c) === i),
  ];

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  // Group by category for "all" view
  const grouped = CATEGORY_ORDER.reduce<Record<string, PrintTemplate[]>>((acc, cat) => {
    const items = filtered.filter((t) => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});
  // Add any remaining categories not in CATEGORY_ORDER
  filtered.forEach((t) => {
    if (!CATEGORY_ORDER.includes(t.category)) {
      (grouped[t.category] ??= []).push(t);
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/print"
          className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 flex-shrink-0"
          aria-label="Back to print"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-purple-600" />
            Print Templates
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pre-designed, auto-branded with your campaign colours and logo.
          </p>
        </div>
      </div>

      {/* ── Brand kit CTA ────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-[#0A2342] to-[#1D9E75] p-4 md:p-5 text-white flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm md:text-base">Brand Kit auto-applied</p>
          <p className="text-xs text-emerald-100 mt-0.5">
            Your campaign name, colours, and logo fill in automatically on every template.
          </p>
        </div>
        <Link
          href="/settings/brand"
          className="flex-shrink-0 bg-white text-[#0A2342] font-bold text-sm px-4 h-9 rounded-lg flex items-center hover:bg-emerald-50 transition-colors"
        >
          Edit Brand Kit →
        </Link>
      </div>

      {/* ── Category filter tabs ─────────────────────────────────────────── */}
      {availableCategories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {availableCategories.map((cat) => {
            const label = cat === "all" ? "All Templates" : (PRICING[cat]?.label ?? cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                  activeCategory === cat
                    ? "bg-[#0A2342] text-white border-[#0A2342]"
                    : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Templates grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-100 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-slate-600 text-lg">No templates yet</h2>
          <p className="text-sm text-slate-400 mt-1">
            Templates are platform-provided and loaded on first seed.
          </p>
        </div>
      ) : activeCategory !== "all" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((t, idx) => (
              <TemplateCard key={t.id} template={t} campaignId={campaignId} idx={idx} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const p = PRICING[category];
          return (
            <section key={category} className="mb-10">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">{p?.label ?? category}</h2>
                {p && (
                  <p className="text-xs text-slate-500">
                    From ${p.fromCad.toFixed(2)} &bull; {p.turnaround}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t, idx) => (
                  <TemplateCard key={t.id} template={t} campaignId={campaignId} idx={idx} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
