"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Printer, Upload, Palette, User, Phone,
  Globe, Check, Image as ImageIcon, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateInfo {
  id: string;
  slug: string;
  name: string;
  category: string;
  width: number;
  height: number;
}

interface Props {
  campaignId: string;
  campaignName: string;
  template: TemplateInfo;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

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

// ─── Party colour presets ─────────────────────────────────────────────────────

const PARTY_PRESETS = [
  { label: "Liberal", primary: "#D71920", secondary: "#FFFFFF" },
  { label: "Conservative", primary: "#1A4782", secondary: "#FFFFFF" },
  { label: "NDP", primary: "#F58220", secondary: "#FFFFFF" },
  { label: "Green", primary: "#2E7D32", secondary: "#FFFFFF" },
  { label: "Bloc", primary: "#00AEEF", secondary: "#FFFFFF" },
  { label: "Independent", primary: "#1E293B", secondary: "#FFFFFF" },
];

// ─── Tab definition ────────────────────────────────────────────────────────────

type TabId = "identity" | "colours" | "logo";

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: "identity", label: "Identity", Icon: User },
  { id: "colours", label: "Colours", Icon: Palette },
  { id: "logo", label: "Logo", Icon: ImageIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DesignClient({ campaignId, campaignName, template }: Props) {
  // Editor state
  const [candidateName, setCandidateName] = useState("");
  const [tagline, setTagline] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a4782");
  const [secondaryColor, setSecondaryColor] = useState("#d71920");
  const [logoUrl, setLogoUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [quantity, setQuantity] = useState(defaultQty(template.category));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orderPanelOpen, setOrderPanelOpen] = useState(true);

  // Preview iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(500);
  const [previewKey, setPreviewKey] = useState(0); // force re-render iframe on logo upload

  // Debounce timer ref for live preview URL building
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewUrl, setPreviewUrl] = useState(
    `/api/print/preview/${template.slug}?campaignId=${campaignId}&t=${Date.now()}`
  );

  // ── Responsive iframe height ─────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      const aspect = template.height / template.width;
      const el = iframeRef.current?.parentElement;
      if (!el) return;
      setIframeHeight(Math.min(700, el.clientWidth * aspect));
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [template.width, template.height]);

  // ── Rebuild preview URL on any change (debounced 300ms) ──────────────────
  const rebuildPreview = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams({ campaignId, t: String(Date.now()) });
      if (candidateName) p.set("candidateName", candidateName);
      if (tagline) p.set("tagline", tagline);
      if (phone) p.set("phone", phone);
      if (website) p.set("website", website);
      // Pass colours without #  (URL-encode the hash)
      p.set("primaryColor", encodeURIComponent(primaryColor));
      p.set("secondaryColor", encodeURIComponent(secondaryColor));
      if (logoUrl) p.set("logoUrl", logoUrl);
      setPreviewUrl(`/api/print/preview/${template.slug}?${p.toString()}`);
    }, 300);
  }, [candidateName, tagline, phone, website, primaryColor, secondaryColor, logoUrl, campaignId, template.slug]);

  useEffect(() => { rebuildPreview(); }, [rebuildPreview]);

  // ── Logo upload ───────────────────────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadType", "logo");
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "x-campaign-id": campaignId },
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Upload failed");
      }
      const { url } = await res.json() as { url: string };
      setLogoUrl(url);
      setPreviewKey((k) => k + 1);
      toast.success("Logo uploaded and applied.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Save draft order ──────────────────────────────────────────────────────
  async function handleSaveDraft() {
    setSaving(true);
    try {
      const total = priceFor(template.category, quantity);
      const res = await fetch("/api/print/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          templateId: template.id,
          productType: template.category,
          quantity,
          unitPriceCad: total / quantity || null,
          totalPriceCad: total || null,
          designData: {
            templateSlug: template.slug,
            candidateName,
            tagline,
            phone,
            website,
            primaryColor,
            secondaryColor,
            logoUrl,
          },
        }),
      });
      if (!res.ok) throw new Error("Could not save draft");
      setSaved(true);
      toast.success("Draft saved to Print Jobs.");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  const downloadUrl = `/api/print/download/${template.slug}?campaignId=${campaignId}`;
  const total = priceFor(template.category, quantity);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 pb-[env(safe-area-inset-bottom)]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/print/templates"
          className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 flex-shrink-0"
          aria-label="Back to templates"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{template.name}</h1>
          <p className="text-xs text-slate-500">{template.width}&Prime; &times; {template.height}&Prime; &bull; auto-branded for {campaignName}</p>
        </div>
        <Link
          href={downloadUrl}
          className="hidden sm:flex h-10 px-4 rounded-lg border border-slate-200 items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Download
        </Link>
      </div>

      {/* ── Main grid: preview left, editor right ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 md:gap-6">

        {/* ── PREVIEW ──────────────────────────────────────────────────────── */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-sm overflow-hidden">
            <div className="relative w-full bg-slate-50 rounded-lg overflow-hidden">
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={previewUrl}
                title="Live design preview"
                sandbox="allow-same-origin"
                className="w-full border-0"
                style={{ height: iframeHeight, display: "block" }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400 text-center">
            Preview updates live as you edit &mdash; your brand kit is applied automatically.
          </p>
        </div>

        {/* ── EDITOR PANEL ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Design tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-100">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                    activeTab === id
                      ? "border-b-2 border-blue-600 text-blue-700 bg-blue-50/40"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 space-y-3">
              <AnimatePresence mode="wait">
                {activeTab === "identity" && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <Field label="Candidate Name" hint="E.g. Jane Smith">
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Auto-filled from brand kit"
                        className="input-field"
                      />
                    </Field>
                    <Field label="Tagline" hint="E.g. A Stronger Ward 3">
                      <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Auto-filled from brand kit"
                        className="input-field"
                      />
                    </Field>
                    <Field label="Phone" hint="Displayed on contact items">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(416) 555-0100"
                          className="input-field pl-8"
                        />
                      </div>
                    </Field>
                    <Field label="Website" hint="Short URL looks best">
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="janesmithward3.ca"
                          className="input-field pl-8"
                        />
                      </div>
                    </Field>
                    <p className="text-[11px] text-slate-400">
                      Leave blank to use your saved <Link href="/settings/brand" className="underline">brand kit values</Link>.
                    </p>
                  </motion.div>
                )}

                {activeTab === "colours" && (
                  <motion.div
                    key="colours"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Primary Colour">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-md border border-slate-200 flex-shrink-0 cursor-pointer shadow-sm"
                            style={{ background: primaryColor }}
                            onClick={() => document.getElementById("primary-picker")?.click()}
                          />
                          <input
                            id="primary-picker"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="sr-only"
                          />
                          <input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v);
                            }}
                            maxLength={7}
                            className="input-field font-mono text-xs"
                          />
                        </div>
                      </Field>
                      <Field label="Secondary Colour">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-md border border-slate-200 flex-shrink-0 cursor-pointer shadow-sm"
                            style={{ background: secondaryColor }}
                            onClick={() => document.getElementById("secondary-picker")?.click()}
                          />
                          <input
                            id="secondary-picker"
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="sr-only"
                          />
                          <input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSecondaryColor(v);
                            }}
                            maxLength={7}
                            className="input-field font-mono text-xs"
                          />
                        </div>
                      </Field>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Party Presets</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PARTY_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => { setPrimaryColor(p.primary); setSecondaryColor(p.secondary); }}
                            className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div
                              className="w-4 h-4 rounded-sm flex-shrink-0 border border-slate-200"
                              style={{ background: p.primary }}
                            />
                            <span className="text-xs font-medium text-slate-700 truncate">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => { setPrimaryColor("#1a4782"); setSecondaryColor("#d71920"); }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Reset to brand kit colours
                    </button>
                  </motion.div>
                )}

                {activeTab === "logo" && (
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {logoUrl && (
                      <div className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt="Current logo" className="h-12 w-auto max-w-[120px] object-contain" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">Logo applied</p>
                          <p className="text-[11px] text-slate-400 truncate">{logoUrl}</p>
                        </div>
                        <button
                          onClick={() => { setLogoUrl(""); setPreviewKey((k) => k + 1); }}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <label className="block">
                      <div
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
                          uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                        }`}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            <p className="text-sm font-medium text-blue-700">Uploading…</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700">Upload logo</p>
                            <p className="text-xs text-slate-400">PNG, JPG, SVG, WebP &mdash; max 5 MB</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleLogoUpload(f);
                          }}
                        />
                      </div>
                    </label>

                    <p className="text-[11px] text-slate-400">
                      Uploading updates your <Link href="/settings/brand" className="underline">campaign brand kit</Link> automatically.
                      The logo is displayed in the top corner of templates that support it.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Order panel ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setOrderPanelOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 font-bold text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              <span>Get this printed</span>
              {orderPanelOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {orderPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Quantity</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                        className="mt-1.5 w-full h-11 px-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none tabular-nums text-base"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {commonQtyOptions(template.category).map((q) => (
                          <button
                            key={q}
                            onClick={() => setQuantity(q)}
                            className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
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

                    <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between">
                      <span className="text-sm text-slate-500">Estimated total</span>
                      <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                        {total > 0 ? `$${total.toFixed(2)}` : "—"}
                      </span>
                    </div>
                    {total > 0 && (
                      <p className="text-[11px] text-slate-400 -mt-2">CAD, plus shipping and tax at checkout.</p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="h-11 rounded-lg border-2 border-slate-300 font-semibold text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                          <><Check className="w-4 h-4 text-green-600" /> Saved</>
                        ) : (
                          "Save Draft"
                        )}
                      </button>
                      <a
                        href={downloadUrl}
                        className="h-11 rounded-lg border-2 border-slate-300 font-semibold text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                    </div>

                    <button
                      disabled
                      title="Fulfilment integration coming soon"
                      className="w-full h-11 rounded-lg bg-[#0A2342] text-white font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-sm"
                    >
                      <Printer className="w-4 h-4" /> Order printing (soon)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* ── Inline styles ─────────────────────────────────────────────────── */}
      <style jsx global>{`
        .input-field {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
          background: #fff;
        }
        .input-field:focus {
          border-color: #3b82f6;
        }
        .input-field::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {hint && <span className="font-normal text-slate-400 ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
