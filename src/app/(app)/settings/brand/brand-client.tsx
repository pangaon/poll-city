"use client";
import { useState, useMemo } from "react";
import { Palette, Check, Upload, Wand2 } from "lucide-react";
import { AVAILABLE_FONTS, fontCss, PARTY_PRESETS, type BrandKit } from "@/lib/brand/brand-kit";

interface Props {
  campaignId: string;
  campaignName: string;
  initialBrand: BrandKit;
}

export default function BrandClient({ campaignId, campaignName, initialBrand }: Props) {
  const [brand, setBrand] = useState<BrandKit>(initialBrand);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const font = useMemo(() => fontCss(brand.fontPrimary), [brand.fontPrimary]);

  function update<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setBrand((b) => ({ ...b, [key]: value }));
    setSaved(false);
  }

  function applyPreset(presetKey: keyof typeof PARTY_PRESETS) {
    const p = PARTY_PRESETS[presetKey];
    setBrand((b) => ({ ...b, primaryColor: p.primary, secondaryColor: p.secondary }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/brand", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          accentColor: brand.accentColor,
          fontPrimary: brand.fontPrimary,
          tagline: brand.tagline ?? "",
          websiteUrl: brand.websiteUrl ?? "",
          twitterHandle: brand.twitter ?? "",
          facebookUrl: brand.facebook ?? "",
          instagramHandle: brand.instagram ?? "",
          logoUrl: brand.logoUrl ?? "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-7 h-7 text-blue-700" /> Brand Kit
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Set your colours, logo, and fonts once. Every flyer, email, and print template uses them automatically.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form — mobile first, 3/5 on desktop */}
        <div className="lg:col-span-3 space-y-5">
          {/* Party presets */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Quick presets
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PARTY_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof PARTY_PRESETS)}
                  className="h-11 rounded-lg border-2 border-slate-200 font-semibold text-sm text-slate-700 hover:border-blue-400 flex items-center justify-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full" style={{ background: p.primary }} />
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Colours */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4">
            <h2 className="font-bold text-slate-900">Colours</h2>
            <ColourInput label="Primary" value={brand.primaryColor} onChange={(v) => update("primaryColor", v)} />
            <ColourInput label="Secondary" value={brand.secondaryColor} onChange={(v) => update("secondaryColor", v)} />
            <ColourInput label="Accent" value={brand.accentColor} onChange={(v) => update("accentColor", v)} />
          </section>

          {/* Logo */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
            <h2 className="font-bold text-slate-900">Logo</h2>
            <p className="text-xs text-slate-500">PNG or SVG, transparent background, max 5 MB. Paste an HTTPS URL for now — file upload coming soon.</p>
            <input
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={brand.logoUrl ?? ""}
              onChange={(e) => update("logoUrl", e.target.value)}
              className="w-full h-12 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
            <button
              type="button"
              className="h-11 w-full md:w-auto px-4 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 opacity-60"
              disabled
            >
              <Upload className="w-4 h-4" /> Upload file (soon)
            </button>
          </section>

          {/* Typography */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
            <h2 className="font-bold text-slate-900">Font</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_FONTS.map((f) => (
                <button
                  key={f.slug}
                  onClick={() => update("fontPrimary", f.slug)}
                  className={`h-12 rounded-lg border-2 px-3 text-left font-semibold flex items-center justify-between ${
                    brand.fontPrimary === f.slug
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                  style={{ fontFamily: f.css }}
                >
                  <span>{f.label}</span>
                  {brand.fontPrimary === f.slug && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </section>

          {/* Identity */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-3">
            <h2 className="font-bold text-slate-900">Identity & contact</h2>
            <TextField label="Tagline / slogan" value={brand.tagline ?? ""} onChange={(v) => update("tagline", v)} placeholder="A fresh voice for our community" maxLength={80} />
            <TextField label="Website" value={brand.websiteUrl ?? ""} onChange={(v) => update("websiteUrl", v)} placeholder="https://mycampaign.ca" inputMode="url" />
            <TextField label="Twitter / X handle" value={brand.twitter ?? ""} onChange={(v) => update("twitter", v)} placeholder="@handle" />
            <TextField label="Facebook page URL" value={brand.facebook ?? ""} onChange={(v) => update("facebook", v)} placeholder="https://facebook.com/..." inputMode="url" />
            <TextField label="Instagram handle" value={brand.instagram ?? ""} onChange={(v) => update("instagram", v)} placeholder="@handle" />
          </section>

          {/* Save */}
          <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-slate-200 lg:static lg:mx-0 lg:p-0 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
            <button
              onClick={save}
              disabled={saving}
              className="w-full lg:w-auto h-12 px-8 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? "Saving…" : saved ? (<><Check className="w-5 h-5" /> Saved</>) : "Save Brand Kit"}
            </button>
            {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
          </div>
        </div>

        {/* Live preview — sticky on desktop, shows above on mobile */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Live preview</h2>
            <DoorHangerPreview brand={brand} font={font} campaignName={campaignName} />
            <EmailHeaderPreview brand={brand} font={font} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-12 rounded-lg border-2 border-slate-300 cursor-pointer"
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-12 px-3 font-mono text-sm border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none uppercase"
          maxLength={7}
        />
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "text" | "url" | "email" | "tel";
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-12 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
      />
    </label>
  );
}

function DoorHangerPreview({
  brand,
  font,
  campaignName,
}: {
  brand: BrandKit;
  font: string;
  campaignName: string;
}) {
  return (
    <div
      className="rounded-xl shadow-lg overflow-hidden border border-slate-200 aspect-[4/11] max-w-[220px] mx-auto"
      style={{ fontFamily: font }}
    >
      <div className="h-2/3 flex flex-col items-center justify-center text-center p-4" style={{ background: brand.primaryColor, color: "#fff" }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt="" className="h-14 w-auto mb-2" />
        ) : null}
        <p className="text-xs uppercase tracking-widest opacity-80">VOTE</p>
        <h3 className="text-xl font-extrabold leading-tight mt-1">{brand.candidateName ?? campaignName}</h3>
        {brand.tagline && <p className="text-xs mt-3 opacity-90">{brand.tagline}</p>}
      </div>
      <div className="h-1/3 p-3 text-center" style={{ background: brand.secondaryColor, color: brand.secondaryColor === "#FFFFFF" || brand.secondaryColor.toLowerCase() === "#ffffff" ? "#0f172a" : "#fff" }}>
        <p className="text-[10px] font-bold uppercase" style={{ color: brand.accentColor }}>Election Day</p>
        <p className="text-xs mt-1">{brand.websiteUrl ?? "vote.campaign.ca"}</p>
        {brand.twitter && <p className="text-[10px] mt-1 opacity-80">@{brand.twitter.replace(/^@/, "")}</p>}
      </div>
    </div>
  );
}

function EmailHeaderPreview({ brand, font }: { brand: BrandKit; font: string }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ fontFamily: font }}>
      <div className="p-4" style={{ background: brand.primaryColor }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt="" className="h-8 w-auto" />
        ) : (
          <p className="text-white font-bold text-lg">{brand.campaignName}</p>
        )}
      </div>
      <div className="p-4 text-sm text-slate-700">
        <p className="font-semibold">Dear supporter,</p>
        <p className="mt-2 text-slate-600">This is how your campaign emails look with your brand kit applied.</p>
        <button
          className="mt-3 px-4 py-2 rounded-lg text-white font-semibold text-xs"
          style={{ background: brand.accentColor }}
        >
          Support the campaign
        </button>
      </div>
    </div>
  );
}
