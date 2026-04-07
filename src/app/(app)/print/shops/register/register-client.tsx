"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, Printer, Star, Shield, Clock, DollarSign,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, FormField, Input, Textarea, Select, PageHeader,
} from "@/components/ui";
import { toast } from "sonner";

const SPECIALTIES = [
  { id: "lawn_sign", label: "Lawn Signs" },
  { id: "door_hanger", label: "Door Hangers" },
  { id: "flyer", label: "Flyers" },
  { id: "palm_card", label: "Palm Cards" },
  { id: "mailer_postcard", label: "Postcards" },
  { id: "bumper_sticker", label: "Bumper Stickers" },
  { id: "button_pin", label: "Buttons" },
  { id: "t_shirt", label: "T-Shirts" },
  { id: "hat", label: "Hats" },
  { id: "tote_bag", label: "Tote Bags" },
  { id: "banner", label: "Banners" },
  { id: "window_sign", label: "Window Clings" },
  { id: "yard_stake", label: "Yard Stakes" },
  { id: "table_cover", label: "Table Covers" },
  { id: "lanyard", label: "Lanyards" },
];

const PROVINCES = [
  ["ON", "Ontario"],
  ["BC", "British Columbia"],
  ["AB", "Alberta"],
  ["QC", "Quebec"],
  ["MB", "Manitoba"],
  ["SK", "Saskatchewan"],
  ["NS", "Nova Scotia"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland & Labrador"],
  ["PE", "Prince Edward Island"],
];

interface Form {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  provincesServed: string[];
  specialties: string[];
  minimumOrder: string;
  averageResponseHours: string;
  portfolioUrls: string;
}

const EMPTY: Form = {
  name: "", contactName: "", email: "", phone: "", website: "",
  description: "", provincesServed: [], specialties: [],
  minimumOrder: "", averageResponseHours: "24", portfolioUrls: "",
};

export default function ShopRegisterClient() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMulti(field: "provincesServed" | "specialties", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter((v) => v !== value)
        : [...(prev[field] as string[]), value],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Business name and email are required");
      return;
    }
    if (form.specialties.length === 0) {
      toast.error("Select at least one product specialty");
      return;
    }
    if (form.provincesServed.length === 0) {
      toast.error("Select at least one province you serve");
      return;
    }

    setSubmitting(true);
    try {
      const portfolioArr = form.portfolioUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch("/api/print/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || undefined,
          email: form.email,
          phone: form.phone || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          provincesServed: form.provincesServed,
          specialties: form.specialties,
          minimumOrder: form.minimumOrder ? Number(form.minimumOrder) : undefined,
          averageResponseHours: form.averageResponseHours ? Number(form.averageResponseHours) : 24,
          portfolio: portfolioArr,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Application Received!</h2>
        <p className="text-gray-600 leading-relaxed">
          Thank you for registering your print shop on Poll City Print. Our team will review
          your application and reach out to <strong>{form.email}</strong> within 1–2 business days
          to verify your shop and set up your Stripe payout account.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-left space-y-2 text-sm text-blue-800">
          <p className="font-semibold">What happens next?</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>Verification call or email within 1–2 business days</li>
            <li>Stripe Connect onboarding link to receive payments</li>
            <li>Profile goes live and you start receiving job bids</li>
          </ul>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/print/shops">
            <Button variant="outline">Browse Shops</Button>
          </Link>
          <Link href="/print">
            <Button>Go to Print</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/print/shops">
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Register Your Print Shop"
          description="Join Poll City Print to receive campaign print job bids from across Canada"
        />
      </div>

      {/* Why join */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <DollarSign className="w-4 h-4" />, label: "Competitive bids", colour: "text-green-600 bg-green-50" },
          { icon: <Shield className="w-4 h-4" />, label: "Verified profile", colour: "text-blue-600 bg-blue-50" },
          { icon: <Clock className="w-4 h-4" />, label: "Fast payments", colour: "text-purple-600 bg-purple-50" },
          { icon: <Star className="w-4 h-4" />, label: "Rated & reviewed", colour: "text-amber-600 bg-amber-50" },
        ].map(({ icon, label, colour }) => (
          <div key={label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold text-center ${colour}`}>
            {icon}
            {label}
          </div>
        ))}
      </div>

      {/* Business info */}
      <Card>
        <CardHeader><h3 className="font-semibold flex items-center gap-2"><Printer className="w-4 h-4" />Business Information</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Business Name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Print Co." />
            </FormField>
            <FormField label="Contact Name">
              <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jane Smith" />
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Business Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="orders@acmeprint.ca" />
            </FormField>
            <FormField label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="416-555-0123" />
            </FormField>
          </div>

          <FormField label="Website">
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://acmeprint.ca" />
          </FormField>

          <FormField label="About Your Shop">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Describe your printing capabilities, turnaround times, equipment, and what makes your shop great for political campaigns…"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader><h3 className="font-semibold">Product Specialties</h3></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">Select all products you can produce at high quality:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPECIALTIES.map(({ id, label }) => {
              const active = form.specialties.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleMulti("specialties", id)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-center ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {active && <CheckCircle className="w-3 h-3 inline mr-1 text-blue-600" />}
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service area */}
      <Card>
        <CardHeader><h3 className="font-semibold">Service Area</h3></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">Which provinces do you ship to?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVINCES.map(([code, name]) => {
              const active = form.provincesServed.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleMulti("provincesServed", code)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border-2 transition-colors text-left ${
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {active && <CheckCircle className="w-3 h-3 inline mr-1 text-blue-600" />}
                  {name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Capacity */}
      <Card>
        <CardHeader><h3 className="font-semibold">Capacity & Turnaround</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Minimum Order ($)">
              <Input
                type="number"
                min="0"
                value={form.minimumOrder}
                onChange={(e) => set("minimumOrder", e.target.value)}
                placeholder="50"
              />
            </FormField>
            <FormField label="Avg. Response Time (hours)">
              <Select value={form.averageResponseHours} onChange={(e) => set("averageResponseHours", e.target.value)}>
                <option value="4">Within 4 hours</option>
                <option value="8">Within 8 hours</option>
                <option value="24">Within 24 hours</option>
                <option value="48">Within 48 hours</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Portfolio URLs (one per line, optional)">
            <Textarea
              value={form.portfolioUrls}
              onChange={(e) => set("portfolioUrls", e.target.value)}
              rows={3}
              placeholder="https://acmeprint.ca/portfolio/lawn-sign-example.jpg&#10;https://acmeprint.ca/portfolio/door-hanger.jpg"
            />
            <p className="text-xs text-gray-400 mt-1">Link to photos of your work to help campaigns choose your shop.</p>
          </FormField>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            By registering, you agree to Poll City Print's vendor terms: a <strong>15% platform fee</strong> is
            deducted from each awarded bid, with the remainder paid via Stripe within 3 business days of the
            campaign confirming delivery. Poll City reserves the right to remove shops that receive repeated
            quality complaints.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" loading={submitting} className="w-full" size="lg">
        <Printer className="w-4 h-4 mr-2" />
        Submit Application
      </Button>
    </form>
  );
}
