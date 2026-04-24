"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Printer, Users, Video, Camera, Pen, Globe, Phone, MapPin,
  Briefcase, DollarSign, Scale, BarChart2, Search, CalendarDays,
  Languages, Mic, Radio, Mail, ShoppingBag, Database, Code,
  Package, ChevronRight, ChevronLeft, CheckCircle, Zap, Star
} from "lucide-react";

// ─── Category registry ─────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "print_shop",          label: "Print Shop",           icon: Printer,      desc: "Lawn signs, flyers, mailers, all print materials" },
  { id: "sign_crew",           label: "Sign Crew",            icon: MapPin,       desc: "Install, remove, and manage campaign signage" },
  { id: "video_production",    label: "Video Production",     icon: Video,        desc: "Campaign ads, testimonials, social content" },
  { id: "photography",         label: "Photography",          icon: Camera,       desc: "Headshots, events, canvassing photo coverage" },
  { id: "graphic_design",      label: "Graphic Design",       icon: Pen,          desc: "Brand identity, print-ready files, digital assets" },
  { id: "digital_advertising", label: "Digital Advertising",  icon: Globe,        desc: "Meta, Google, programmatic, social ad campaigns" },
  { id: "phone_banking",       label: "Phone Banking",        icon: Phone,        desc: "Voter outreach, ID calls, GOTV phone operations" },
  { id: "canvassing_crew",     label: "Canvassing Crew",      icon: Users,        desc: "Door-to-door canvassing, voter contact teams" },
  { id: "campaign_manager",    label: "Campaign Manager",     icon: Briefcase,    desc: "Full campaign strategy and day-to-day management" },
  { id: "financial_agent",     label: "Financial Agent",      icon: DollarSign,   desc: "Campaign finance filings, fundraising compliance" },
  { id: "accountant",          label: "Accountant",           icon: BarChart2,    desc: "Bookkeeping, expense tracking, financial reporting" },
  { id: "election_lawyer",     label: "Election Lawyer",      icon: Scale,        desc: "Election law, compliance, candidate eligibility" },
  { id: "polling_firm",        label: "Polling Firm",         icon: BarChart2,    desc: "Voter surveys, public opinion research, analytics" },
  { id: "opposition_research", label: "Opposition Research",  icon: Search,       desc: "Opposition vetting, issue research, rapid response" },
  { id: "event_planning",      label: "Event Planning",       icon: CalendarDays, desc: "Rallies, fundraisers, town halls, door-knockers" },
  { id: "translation_services",label: "Translation",          icon: Languages,    desc: "Multilingual campaign materials and communications" },
  { id: "speaking_coach",      label: "Speaking Coach",       icon: Mic,          desc: "Debate prep, public speaking, media training" },
  { id: "media_trainer",       label: "Media Trainer",        icon: Radio,        desc: "Broadcast media, press scrums, interview coaching" },
  { id: "mail_house",          label: "Mail House",           icon: Mail,         desc: "Direct mail, voter file targeting, bulk delivery" },
  { id: "merchandise",         label: "Merchandise",          icon: ShoppingBag,  desc: "T-shirts, hats, buttons, branded campaign swag" },
  { id: "data_analytics",      label: "Data & Analytics",     icon: Database,     desc: "Voter data, targeting models, demographic analysis" },
  { id: "website_tech",        label: "Website & Tech",       icon: Code,         desc: "Campaign websites, digital tools, tech infrastructure" },
  { id: "other",               label: "Other Services",       icon: Package,      desc: "Any other campaign support service" },
];

// Print-specific product types (matches PrintProductType enum)
const PRINT_SPECIALTIES = [
  { id: "lawn_sign",        label: "Lawn Signs" },
  { id: "door_hanger",      label: "Door Hangers" },
  { id: "flyer",            label: "Flyers" },
  { id: "palm_card",        label: "Palm Cards" },
  { id: "mailer_postcard",  label: "Mailer Postcards" },
  { id: "banner",           label: "Banners" },
  { id: "button_pin",       label: "Buttons / Pins" },
  { id: "window_sign",      label: "Window Signs" },
  { id: "bumper_sticker",   label: "Bumper Stickers" },
  { id: "t_shirt",          label: "T-Shirts" },
  { id: "yard_stake",       label: "Yard Stakes" },
  { id: "lanyard",          label: "Lanyards" },
  { id: "tote_bag",         label: "Tote Bags" },
  { id: "table_cover",      label: "Table Covers" },
  { id: "hat",              label: "Hats" },
];

const PROVINCES = [
  ["ON", "Ontario"], ["BC", "British Columbia"], ["AB", "Alberta"],
  ["QC", "Quebec"], ["MB", "Manitoba"], ["SK", "Saskatchewan"],
  ["NS", "Nova Scotia"], ["NB", "New Brunswick"], ["NL", "Newfoundland"],
  ["PE", "PEI"], ["NT", "NWT"], ["YT", "Yukon"], ["NU", "Nunavut"],
];

type Step = "categories" | "account" | "business" | "print-details" | "done";

export default function VendorSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("categories");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    // Step 1
    categories: [] as string[],
    // Step 2
    email: "",
    password: "",
    confirmPassword: "",
    // Step 3
    name: "",
    contactName: "",
    phone: "",
    website: "",
    bio: "",
    provincesServed: [] as string[],
    yearsExperience: "",
    rateFrom: "",
    // Step 4 (print only)
    printSpecialties: [] as string[],
    averageResponseHours: "24",
  });

  const isPrintShop = form.categories.includes("print_shop");
  const steps: Step[] = isPrintShop
    ? ["categories", "account", "business", "print-details"]
    : ["categories", "account", "business"];

  const stepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function toggleArr(field: "categories" | "provincesServed" | "printSpecialties", value: string) {
    setForm((p) => ({
      ...p,
      [field]: (p[field] as string[]).includes(value)
        ? (p[field] as string[]).filter((v) => v !== value)
        : [...(p[field] as string[]), value],
    }));
  }

  function validateStep(): string {
    if (step === "categories") {
      if (form.categories.length === 0) return "Select at least one service category.";
    }
    if (step === "account") {
      if (!form.email.trim()) return "Email is required.";
      if (!form.password) return "Password is required.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (step === "business") {
      if (!form.name.trim()) return "Business name is required.";
      if (form.provincesServed.length === 0) return "Select at least one province you serve.";
    }
    if (step === "print-details") {
      if (form.printSpecialties.length === 0) return "Select at least one print product type.";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    } else {
      submit();
    }
  }

  function back() {
    setError("");
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: form.categories,
          name: form.name,
          contactName: form.contactName || undefined,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          website: form.website || undefined,
          bio: form.bio || undefined,
          provincesServed: form.provincesServed,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
          rateFrom: form.rateFrom ? parseFloat(form.rateFrom) : undefined,
          printSpecialties: isPrintShop ? form.printSpecialties : undefined,
          averageResponseHours: isPrintShop ? parseInt(form.averageResponseHours) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        setSaving(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/vendor/dashboard");
      } else {
        setStep("done");
        setSaving(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // ── Done state ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#0A2342] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in the network</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your vendor profile is live. Sign in to see available campaign jobs and manage your profile.
          </p>
          <Link
            href="/vendor/login"
            className="block bg-[#1D9E75] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#17865f] transition-colors"
          >
            Sign In to Vendor Portal
          </Link>
        </div>
      </div>
    );
  }

  // ── Progress bar ────────────────────────────────────────────────────────
  const progressPct = ((stepIndex + 1) / (totalSteps + 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0A2342]">
      {/* Top bar */}
      <div className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#1D9E75]" />
          <span className="font-bold text-white text-sm">Poll City Vendor Network</span>
        </div>
        <Link href="/vendor/login" className="text-white/50 text-xs hover:text-white/80 transition-colors">
          Already a member? Sign in
        </Link>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < stepIndex ? "bg-[#1D9E75] text-white" :
                i === stepIndex ? "bg-white text-[#0A2342]" :
                "bg-white/20 text-white/40"
              }`}>
                {i < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded transition-colors ${i < stepIndex ? "bg-[#1D9E75]" : "bg-white/20"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-full mt-2">
          <div
            className="h-1 bg-[#1D9E75] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-16">
        {/* ── STEP 1: CATEGORY SELECTION ─────────────────────────────────── */}
        {step === "categories" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">What do you offer?</h1>
              <p className="text-white/60 text-sm max-w-lg mx-auto">
                Canadian campaigns use Poll City to find every service they need. Select all that apply — your profile will be shown to campaigns searching for these services.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {CATEGORIES.map(({ id, label, icon: Icon, desc }) => {
                const active = form.categories.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleArr("categories", id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      active
                        ? "border-[#1D9E75] bg-[#1D9E75]/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-[#1D9E75] rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-2 ${active ? "text-[#1D9E75]" : "text-white/40"}`} />
                    <div className="font-semibold text-sm leading-tight mb-0.5">{label}</div>
                    <div className="text-xs text-white/40 leading-snug">{desc}</div>
                  </button>
                );
              })}
            </div>

            {form.categories.length > 0 && (
              <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#1D9E75] shrink-0" />
                <p className="text-sm text-white/80">
                  <span className="font-semibold text-white">{form.categories.length} {form.categories.length === 1 ? "category" : "categories"} selected.</span>
                  {" "}Your profile will appear in searches for: {form.categories.map((id) => CATEGORIES.find((c) => c.id === id)?.label).join(", ")}.
                </p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              type="button"
              onClick={next}
              className="w-full bg-[#1D9E75] text-white py-3 rounded-xl font-semibold hover:bg-[#17865f] transition-colors text-sm flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2: ACCOUNT ────────────────────────────────────────────── */}
        {step === "account" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
              <p className="text-white/60 text-sm">Your login credentials for the vendor portal.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="orders@yourcompany.ca"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <StepNav onBack={back} onNext={next} saving={saving} isLast={false} />
          </div>
        )}

        {/* ── STEP 3: BUSINESS INFO ───────────────────────────────────────── */}
        {step === "business" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Tell campaigns about you</h1>
              <p className="text-white/60 text-sm">This is your public vendor profile — campaigns browse this to find and hire you.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 space-y-4 mb-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Campaign Services"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="416-555-0123"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://yourcompany.ca"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About You / Your Company</label>
                <textarea
                  rows={3}
                  placeholder="Describe your experience with political campaigns, what makes you great at what you do, and your typical turnaround…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Campaign Experience</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 8"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.yearsExperience}
                    onChange={(e) => set("yearsExperience", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Rate (CAD/hr or flat)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 75.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    value={form.rateFrom}
                    onChange={(e) => set("rateFrom", e.target.value)}
                  />
                </div>
              </div>

              {/* Provinces */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provinces You Serve <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROVINCES.map(([code, name]) => {
                    const active = form.provincesServed.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleArr("provincesServed", code)}
                        className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-center ${
                          active
                            ? "border-[#1D9E75] bg-green-50 text-green-800"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <StepNav onBack={back} onNext={next} saving={saving} isLast={!isPrintShop} />
          </div>
        )}

        {/* ── STEP 4: PRINT SHOP DETAILS ─────────────────────────────────── */}
        {step === "print-details" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Print shop specialties</h1>
              <p className="text-white/60 text-sm">Tell campaigns exactly what you can produce. More selections = more jobs you&apos;ll see.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 space-y-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Products you produce <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRINT_SPECIALTIES.map(({ id, label }) => {
                    const active = form.printSpecialties.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleArr("printSpecialties", id)}
                        className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-center ${
                          active
                            ? "border-[#1D9E75] bg-green-50 text-green-800"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average quote response time
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  value={form.averageResponseHours}
                  onChange={(e) => set("averageResponseHours", e.target.value)}
                >
                  <option value="4">Within 4 hours</option>
                  <option value="12">Within 12 hours</option>
                  <option value="24">Within 24 hours</option>
                  <option value="48">Within 48 hours</option>
                  <option value="72">Within 3 days</option>
                </select>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <StepNav onBack={back} onNext={next} saving={saving} isLast={true} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav component ──────────────────────────────────────────────────────────

function StepNav({
  onBack,
  onNext,
  saving,
  isLast,
}: {
  onBack: () => void;
  onNext: () => void;
  saving: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={saving}
        className="flex-1 bg-[#1D9E75] text-white py-2.5 rounded-xl font-semibold hover:bg-[#17865f] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
      >
        {saving ? "Creating your profile…" : isLast ? "Join the Network" : (
          <>Continue <ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}
