"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, FormField, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { PRINT_PRODUCTS, getPrintProduct } from "@/lib/print/catalog";
import { toast } from "sonner";

interface Props { campaignId: string; }

type DesignMethod = "upload" | "template" | "designer";

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

export default function NewPrintJobClient({ campaignId }: Props) {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("product") || "";
  const [step, setStep] = useState(1);
  const [posting, setPosting] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const [form, setForm] = useState({
    product: preselected,
    quantity: 250,
    size: "",
    stock: "Standard",
    coatingUV: false,
    coatingMatte: false,
    turnaround: "standard",
    doubleSided: true,
    designMethod: "upload" as DesignMethod,
    fileUrl: "",
    designerBrief: "",
    designerEmail: "",
    address: "",
    city: "",
    province: "ON",
    postalCode: "",
    requestedDate: "",
    specialInstructions: "",
  });

  const product = useMemo(() => getPrintProduct(form.product), [form.product]);

  const basePrice = useMemo(() => {
    if (!product) return 0;
    const firstTierQty = Number(product.pricing[0].label.split(" - ").pop() || product.pricing[0].label || "1");
    const firstTierPrice = product.pricing[0].price;
    return Number(((firstTierPrice / Math.max(firstTierQty, 1)) * form.quantity).toFixed(2));
  }, [product, form.quantity]);

  const turnaroundMultiplier = form.turnaround === "rush" ? 1.4 : form.turnaround === "economy" ? 0.9 : 1;
  const totalPrice = Number((basePrice * turnaroundMultiplier).toFixed(2));
  const unitPrice = form.quantity > 0 ? Number((totalPrice / form.quantity).toFixed(2)) : 0;

  async function uploadPrintFile(file: File) {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("uploadType", "print");

    const res = await fetch("/api/upload/logo", {
      method: "POST",
      headers: { "x-campaign-id": campaignId },
      body: payload,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    setForm((prev) => ({ ...prev, fileUrl: data.url }));
    toast.success("Print file uploaded");
  }

  async function postJob() {
    if (!product) return;
    setPosting(true);
    try {
      const payload = {
        campaignId,
        productType: product.id.replace(/-/g, "_"),
        title: `${product.name} - ${form.quantity.toLocaleString()} units`,
        quantity: form.quantity,
        description: `${product.summary}. Size: ${form.size || "default"}. Stock: ${form.stock}.`,
        specs: {
          product: product.id,
          size: form.size,
          stock: form.stock,
          coatingUV: form.coatingUV,
          coatingMatte: form.coatingMatte,
          turnaround: form.turnaround,
          doubleSided: form.doubleSided,
          designMethod: form.designMethod,
          unitPrice,
          totalPrice,
        },
        deadline: form.requestedDate || undefined,
        deliveryAddress: form.address || undefined,
        deliveryCity: form.city || undefined,
        deliveryPostal: form.postalCode || undefined,
        notes: `${form.specialInstructions}\nDesigner: ${form.designerEmail || "n/a"}\nBrief: ${form.designerBrief || "n/a"}`,
        fileUrl: form.fileUrl || undefined,
        status: "posted",
      };

      const res = await fetch("/api/print/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post job");
      setCreatedJobId(data.data.id);
      setStep(6);
      toast.success("Job posted to marketplace");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post job");
    } finally {
      setPosting(false);
    }
  }

  if (step === 6 && createdJobId) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold">Print Job Posted</h2>
          <p className="text-sm text-gray-600">Job ID: {createdJobId}</p>
          <Link href={`/print/jobs/${createdJobId}`}><Button>View Job</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/print/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <PageHeader title="New Print Job Wizard" description="Step-by-step campaign print procurement" />
      </div>

      <div className="flex gap-2 text-xs font-semibold text-gray-500">
        {["Product", "Specifications", "Design", "Delivery", "Review"].map((label, idx) => (
          <span key={label} className={`px-2 py-1 rounded ${step === idx + 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>{idx + 1}. {label}</span>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 1: Product Selection</h3></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRINT_PRODUCTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setForm((prev) => ({ ...prev, product: p.id, size: p.sizes[0] }))}
                className={`rounded-xl border-2 p-3 text-left transition-all ${form.product === p.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
              >
                <div className={`h-16 rounded bg-gradient-to-br ${p.heroClass} mb-3`} />
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">Starting at {p.startingPrice}</p>
                <p className="text-xs text-gray-500 mt-1">{p.summary}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && product && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 2: Specifications</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Quantity">
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value || 1) }))} />
              </FormField>
              <FormField label="Size">
                <Select value={form.size} onChange={(e) => setForm((prev) => ({ ...prev, size: e.target.value }))}>
                  {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Paper Stock"><Input value={form.stock} onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))} /></FormField>
              <FormField label="Turnaround">
                <Select value={form.turnaround} onChange={(e) => setForm((prev) => ({ ...prev, turnaround: e.target.value }))}>
                  <option value="rush">Rush 3 days (+40%)</option>
                  <option value="standard">Standard 7 days</option>
                  <option value="economy">Economy 14 days (-10%)</option>
                </Select>
              </FormField>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" checked={form.coatingUV} onChange={(e) => setForm((prev) => ({ ...prev, coatingUV: e.target.checked }))} /> UV coating</label>
              <label><input type="checkbox" checked={form.coatingMatte} onChange={(e) => setForm((prev) => ({ ...prev, coatingMatte: e.target.checked }))} /> Matte coating</label>
              <label><input type="checkbox" checked={form.doubleSided} onChange={(e) => setForm((prev) => ({ ...prev, doubleSided: e.target.checked }))} /> Double sided</label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && product && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 3: Design</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "upload", label: "Upload Print-Ready File" },
                { id: "template", label: "Download Template" },
                { id: "designer", label: "I Have a Designer" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setForm((prev) => ({ ...prev, designMethod: opt.id as DesignMethod }))}
                  className={`rounded-xl border p-3 text-sm font-medium ${form.designMethod === opt.id ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.designMethod === "upload" && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Drop your PDF/AI file or choose from disk.</p>
                <Input type="file" accept=".pdf,.ai,.png,.jpg,.jpeg,.tif,.tiff" onChange={(e) => e.target.files?.[0] && uploadPrintFile(e.target.files[0])} />
                {form.fileUrl && <p className="text-xs text-emerald-700 mt-2">Uploaded file ready.</p>}
              </div>
            )}

            {form.designMethod === "template" && (
              <Card>
                <CardContent className="p-4 text-sm space-y-2">
                  <a href="https://www.canva.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Canva template link</a>
                  <a href="https://www.adobe.com/products/illustrator.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">Adobe Illustrator template link</a>
                  <p className="text-gray-600">Design to size {form.size} with required bleed and safe zone.</p>
                </CardContent>
              </Card>
            )}

            {form.designMethod === "designer" && (
              <div className="space-y-3">
                <FormField label="Designer Contact Email"><Input value={form.designerEmail} onChange={(e) => setForm((prev) => ({ ...prev, designerEmail: e.target.value }))} /></FormField>
                <FormField label="Design Brief"><Textarea rows={4} value={form.designerBrief} onChange={(e) => setForm((prev) => ({ ...prev, designerBrief: e.target.value }))} /></FormField>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 4: Delivery Details</h3></CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Street Address"><Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="City"><Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} /></FormField>
              <FormField label="Province">
                <Select value={form.province} onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Postal Code"><Input value={form.postalCode} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} /></FormField>
            </div>
            <FormField label="Requested Delivery Date"><Input type="date" value={form.requestedDate} onChange={(e) => setForm((prev) => ({ ...prev, requestedDate: e.target.value }))} /></FormField>
            <FormField label="Special Instructions"><Textarea rows={3} value={form.specialInstructions} onChange={(e) => setForm((prev) => ({ ...prev, specialInstructions: e.target.value }))} /></FormField>
          </CardContent>
        </Card>
      )}

      {step === 5 && product && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 5: Review and Post</h3></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Product:</strong> {product.name}</p>
            <p><strong>Specs:</strong> {form.size}, {form.stock}, {form.doubleSided ? "Double sided" : "Single sided"}</p>
            <p><strong>Quantity:</strong> {form.quantity.toLocaleString()}</p>
            <p><strong>Unit Price:</strong> ${unitPrice.toFixed(2)}</p>
            <p><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
            <p><strong>Turnaround:</strong> {form.turnaround}</p>
            <p><strong>Delivery:</strong> {[form.address, form.city, form.province, form.postalCode].filter(Boolean).join(", ") || "Not set"}</p>
            <p><strong>Estimated Delivery Window:</strong> based on selected turnaround and requested date</p>
            <Button onClick={postJob} loading={posting}>Post to Marketplace</Button>
          </CardContent>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="text-sm text-gray-600">Running total: <span className="font-bold text-gray-900">${totalPrice.toFixed(2)}</span></p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</Button>
            <Button disabled={(step === 1 && !form.product) || step === 5} onClick={() => setStep((s) => Math.min(5, s + 1))}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
