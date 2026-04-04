"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Upload, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, FormField, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";

interface Props { campaignId: string; }

const PRODUCTS = [
  { id: "door_hanger", label: "Door Hanger", icon: "🚪" },
  { id: "lawn_sign", label: "Lawn Sign", icon: "🪧" },
  { id: "flyer", label: "Flyer", icon: "📄" },
  { id: "palm_card", label: "Palm Card", icon: "✋" },
  { id: "mailer_postcard", label: "Mailer / Postcard", icon: "✉️" },
  { id: "banner", label: "Banner", icon: "🏳️" },
  { id: "button_pin", label: "Button / Pin", icon: "📌" },
  { id: "window_sign", label: "Window Sign", icon: "🪟" },
];

const QUANTITY_OPTIONS: Record<string, string[]> = {
  door_hanger: ["500", "1000", "2500", "5000", "10000"],
  lawn_sign: ["25", "50", "100", "250", "500"],
  flyer: ["250", "500", "1000", "2500", "5000"],
  palm_card: ["250", "500", "1000", "2500", "5000"],
  mailer_postcard: ["200", "500", "1000", "2500", "5000"],
  banner: ["1", "2", "5", "10", "20"],
  button_pin: ["100", "250", "500", "1000", "2000"],
  window_sign: ["100", "250", "500", "1000"],
};

export default function NewPrintJobClient({ campaignId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProduct = searchParams.get("product") ?? "";

  const [step, setStep] = useState(preselectedProduct ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    productType: preselectedProduct,
    title: "",
    quantity: "",
    description: "",
    deadline: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryPostal: "",
    budgetMin: "",
    budgetMax: "",
    notes: "",
    fileUrl: "",
    postNow: false,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(postNow: boolean) {
    if (!form.productType || !form.title || !form.quantity) {
      toast.error("Product, title and quantity are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/print/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          productType: form.productType,
          title: form.title,
          quantity: Number(form.quantity),
          description: form.description || undefined,
          deadline: form.deadline || undefined,
          deliveryAddress: form.deliveryAddress || undefined,
          deliveryCity: form.deliveryCity || undefined,
          deliveryPostal: form.deliveryPostal || undefined,
          budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
          notes: form.notes || undefined,
          fileUrl: form.fileUrl || undefined,
          status: postNow ? "posted" : "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create job");
      toast.success(postNow ? "Job posted to marketplace!" : "Draft saved");
      router.push(`/print/jobs/${data.data.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProduct = PRODUCTS.find((p) => p.id === form.productType);
  const qtyOptions = form.productType ? QUANTITY_OPTIONS[form.productType] ?? [] : [];

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/print/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <PageHeader title="New Print Job" description="Post a job to receive bids from local print shops" />
      </div>

      {/* Step 1 — Product selection */}
      {step === 1 && (
        <Card>
          <CardHeader><h3 className="font-semibold text-gray-900">Choose a Product</h3></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set("productType", p.id); setStep(2); }}
                  className="flex flex-col items-center gap-2 p-4 border-2 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-colors text-center"
                >
                  <span className="text-3xl">{p.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Job details */}
      {step === 2 && (
        <>
          {/* Selected product */}
          <Card>
            <CardContent className="flex items-center gap-4 py-3">
              <span className="text-2xl">{selectedProduct?.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedProduct?.label}</p>
                <p className="text-xs text-gray-500">Selected product</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setStep(1)}>Change</Button>
            </CardContent>
          </Card>

          {/* Details form */}
          <Card>
            <CardHeader><h3 className="font-semibold text-gray-900">Job Details</h3></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Job Title" required>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder={`e.g. ${selectedProduct?.label} for Ward 3 campaign`}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Quantity" required>
                  <Select value={form.quantity} onChange={(e) => set("quantity", e.target.value)}>
                    <option value="">Select quantity</option>
                    {qtyOptions.map((q) => (
                      <option key={q} value={q}>{Number(q).toLocaleString()} units</option>
                    ))}
                    <option value="custom">Custom</option>
                  </Select>
                </FormField>

                <FormField label="Deadline">
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => set("deadline", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </FormField>
              </div>

              <FormField label="Description / Specs">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe any special requirements: size, colors, finishing, paper stock, artwork notes..."
                  rows={3}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Budget Min ($)">
                  <Input
                    type="number"
                    min="0"
                    value={form.budgetMin}
                    onChange={(e) => set("budgetMin", e.target.value)}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Budget Max ($)">
                  <Input
                    type="number"
                    min="0"
                    value={form.budgetMax}
                    onChange={(e) => set("budgetMax", e.target.value)}
                    placeholder="500"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader><h3 className="font-semibold text-gray-900">Delivery Address</h3></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Street Address">
                <Input
                  value={form.deliveryAddress}
                  onChange={(e) => set("deliveryAddress", e.target.value)}
                  placeholder="123 Main St"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="City">
                  <Input
                    value={form.deliveryCity}
                    onChange={(e) => set("deliveryCity", e.target.value)}
                    placeholder="Toronto"
                  />
                </FormField>
                <FormField label="Postal Code">
                  <Input
                    value={form.deliveryPostal}
                    onChange={(e) => set("deliveryPostal", e.target.value)}
                    placeholder="M4C 1A1"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* File upload placeholder */}
          <Card>
            <CardHeader><h3 className="font-semibold text-gray-900">Design File</h3></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Paste a file URL (Google Drive, Dropbox, WeTransfer) or leave blank if you need the shop to use a template.
              </p>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={form.fileUrl}
                    onChange={(e) => set("fileUrl", e.target.value)}
                    placeholder="https://drive.google.com/file/..."
                  />
                </div>
                <Button variant="outline" size="sm" disabled title="Direct upload coming soon">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
              {!form.fileUrl && (
                <p className="text-xs text-amber-600">No file provided — shops will note that artwork is TBD.</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => submit(false)}
              loading={submitting}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => submit(true)}
              loading={submitting}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4" />
              Post to Marketplace
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
