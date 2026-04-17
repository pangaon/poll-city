"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, LayoutTemplate } from "lucide-react";
import { Button, Card, CardContent, CardHeader, FormField, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { PRINT_PRODUCTS, getPrintProduct } from "@/lib/print/catalog";
import { toast } from "sonner";

interface Props { campaignId: string; }

type DesignMethod = "upload" | "template" | "designer";

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

interface BudgetLine {
  id: string;
  name: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
}

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

export default function NewPrintJobClient({ campaignId }: Props) {
  const searchParams = useSearchParams();
  const preselected = searchParams?.get("product") || "";
  const [step, setStep] = useState(1);
  const [posting, setPosting] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

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
    budgetMin: "",
    budgetMax: "",
  });

  const product = useMemo(() => getPrintProduct(form.product), [form.product]);

  // Compute best-match price from pricing tiers
  const estimatedTotal = useMemo(() => {
    if (!product || form.quantity <= 0) return 0;
    // Find the highest-qty tier that is still <= our quantity
    const sorted = [...product.pricing];
    let bestPrice = sorted[sorted.length - 1].price;
    for (const tier of sorted) {
      const tierQty = parseInt(tier.label.split(" - ").pop() ?? tier.label, 10);
      if (!isNaN(tierQty) && form.quantity >= tierQty) {
        bestPrice = tier.price;
      }
    }
    const mult = form.turnaround === "rush" ? 1.4 : form.turnaround === "economy" ? 0.9 : 1;
    return Number((bestPrice * mult).toFixed(2));
  }, [product, form.quantity, form.turnaround]);

  const unitPrice = form.quantity > 0 ? Number((estimatedTotal / form.quantity).toFixed(2)) : 0;

  // Load templates when user reaches Step 3
  useEffect(() => {
    if (step === 3 && templates.length === 0 && form.product) {
      const category = form.product.replace(/-/g, "_");
      fetch(`/api/print/templates?category=${category}`)
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates ?? []))
        .catch(() => {});
    }
  }, [step, templates.length, form.product]);

  // Load budget lines when user reaches Step 5
  useEffect(() => {
    if (step === 5 && budgetLines.length === 0 && campaignId) {
      setBudgetLoading(true);
      fetch(`/api/finance/budgets?campaignId=${campaignId}`)
        .then((r) => r.json())
        .then((d) => {
          const allLines: BudgetLine[] = [];
          for (const budget of (d.data ?? [])) {
            for (const line of (budget.budgetLines ?? [])) {
              allLines.push(line);
            }
          }
          setBudgetLines(allLines);
        })
        .catch(() => {})
        .finally(() => setBudgetLoading(false));
    }
  }, [step, budgetLines.length, campaignId]);

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

  async function submitJob(asDraft: boolean) {
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
          templateId: selectedTemplateId,
          unitPrice,
          totalPrice: estimatedTotal,
        },
        deadline: form.requestedDate || undefined,
        deliveryAddress: form.address || undefined,
        deliveryCity: form.city || undefined,
        deliveryPostal: form.postalCode || undefined,
        notes: `${form.specialInstructions}\nDesigner: ${form.designerEmail || "n/a"}\nBrief: ${form.designerBrief || "n/a"}`,
        fileUrl: form.fileUrl || undefined,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        status: asDraft ? "draft" : "posted",
      };

      const res = await fetch("/api/print/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create job");
      setCreatedJobId(data.data.id);
      setStep(6);
      toast.success(asDraft ? "Job saved as draft" : "Job posted to marketplace");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setPosting(false);
    }
  }

  if (step === 6 && createdJobId) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold">Print Job Created</h2>
          <p className="text-sm text-gray-600">Job ID: {createdJobId}</p>
          <div className="flex justify-center gap-3">
            <Link href={`/print/jobs/${createdJobId}`}><Button>View Job</Button></Link>
            <Link href="/print/jobs"><Button variant="outline">Back to Jobs</Button></Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Budget check helpers
  const printCategories = ["print", "signs", "literature", "advertising", "merchandise"];
  const relevantLines = budgetLines.filter((l) => printCategories.includes(String(l.category)));
  const totalBudgetRemaining = relevantLines.reduce((s, l) => s + Math.max(0, Number(l.plannedAmount) - Number(l.actualAmount)), 0);
  const overBudget = form.budgetMax ? estimatedTotal > Number(form.budgetMax) : false;
  const overCampaignBudget = relevantLines.length > 0 && estimatedTotal > totalBudgetRemaining;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/print/jobs"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <PageHeader title="New Print Job Wizard" description="Step-by-step campaign print procurement" />
      </div>

      <div className="flex gap-2 text-xs font-semibold text-gray-500 flex-wrap">
        {["Product", "Specifications", "Design", "Delivery", "Review"].map((label, idx) => (
          <button
            key={label}
            onClick={() => idx + 1 < step && setStep(idx + 1)}
            className={`px-2 py-1 rounded transition-colors ${step === idx + 1 ? "bg-blue-100 text-blue-700" : idx + 1 < step ? "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer" : "bg-gray-100 text-gray-400"}`}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      {/* Step 1 — Product */}
      {step === 1 && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 1: Product Selection</h3></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRINT_PRODUCTS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setForm((prev) => ({ ...prev, product: p.id, size: p.sizes[0] }));
                  setStep(2);
                }}
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

      {/* Step 2 — Specifications */}
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
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.coatingUV} onChange={(e) => setForm((prev) => ({ ...prev, coatingUV: e.target.checked }))} /> UV coating</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.coatingMatte} onChange={(e) => setForm((prev) => ({ ...prev, coatingMatte: e.target.checked }))} /> Matte coating</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.doubleSided} onChange={(e) => setForm((prev) => ({ ...prev, doubleSided: e.target.checked }))} /> Double sided</label>
            </div>

            {/* Budget fields */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-gray-100">
              <div>
                <FormField label="Budget Min ($)">
                  <Input type="number" min={0} value={form.budgetMin} onChange={(e) => setForm((prev) => ({ ...prev, budgetMin: e.target.value }))} placeholder="e.g. 500" />
                </FormField>
                <p className="text-xs text-gray-400 mt-1">Optional — minimum you want to spend</p>
              </div>
              <div>
                <FormField label="Budget Max ($)">
                  <Input type="number" min={0} value={form.budgetMax} onChange={(e) => setForm((prev) => ({ ...prev, budgetMax: e.target.value }))} placeholder="e.g. 1500" />
                </FormField>
                <p className="text-xs text-gray-400 mt-1">Optional — cap for this job</p>
              </div>
            </div>

            {/* Pricing table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity Pricing Guide</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left px-4 py-2">Tier</th>
                    <th className="text-right px-4 py-2">Standard Price</th>
                    <th className="text-right px-4 py-2">Rush (+40%)</th>
                    <th className="text-right px-4 py-2">Economy (-10%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {product.pricing.map((tier) => {
                    const tierQty = parseInt(tier.label.split(" - ").pop() ?? tier.label, 10);
                    const isSelected = !isNaN(tierQty) && form.quantity >= tierQty;
                    return (
                      <tr key={tier.label} className={isSelected ? "bg-blue-50 font-medium" : ""}>
                        <td className="px-4 py-2 text-gray-700">{tier.label}</td>
                        <td className="px-4 py-2 text-right">${tier.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-orange-600">${(tier.price * 1.4).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">${(tier.price * 0.9).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Design */}
      {step === 3 && product && (
        <Card>
          <CardHeader><h3 className="font-semibold">Step 3: Design</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "upload", label: "Upload Print-Ready File" },
                { id: "template", label: "Use a Template" },
                { id: "designer", label: "I Have a Designer" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setForm((prev) => ({ ...prev, designMethod: opt.id as DesignMethod }))}
                  className={`rounded-xl border p-3 text-sm font-medium transition-colors ${form.designMethod === opt.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.designMethod === "upload" && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">Drop your PDF/AI file or choose from disk.</p>
                <p className="text-xs text-gray-400 mb-3">Requirement: {product.fileRequirements}</p>
                <Input type="file" accept=".pdf,.ai,.png,.jpg,.jpeg,.tif,.tiff" onChange={(e) => e.target.files?.[0] && uploadPrintFile(e.target.files[0]).catch((err) => toast.error((err as Error).message))} />
                {form.fileUrl && <p className="text-xs text-emerald-700 mt-2">✓ File uploaded and ready.</p>}
              </div>
            )}

            {form.designMethod === "template" && (
              <div className="space-y-3">
                {templates.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600 flex items-center gap-1"><LayoutTemplate className="w-4 h-4" /> Select a template — it will be included in your job specs.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id === selectedTemplateId ? null : tpl.id)}
                          className={`rounded-xl border-2 p-2 text-left transition-all ${selectedTemplateId === tpl.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                        >
                          <div className="h-20 rounded bg-gray-100 mb-2 overflow-hidden">
                            {tpl.thumbnail
                              ? <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No preview</div>
                            }
                          </div>
                          <p className="text-xs font-semibold truncate">{tpl.name}</p>
                          <p className="text-xs text-gray-400">{tpl.width}×{tpl.height}</p>
                          {tpl.isPremium && <span className="text-xs text-amber-600 font-medium">Premium</span>}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-4 text-sm space-y-2">
                      <p className="text-gray-600">No templates found for this product type. Use Canva or Adobe Illustrator:</p>
                      <a href="https://www.canva.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">Canva template</a>
                      <a href="https://www.adobe.com/products/illustrator.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">Adobe Illustrator</a>
                      <p className="text-gray-600">Design to size {form.size} with required bleed and safe zone.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
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

      {/* Step 4 — Delivery */}
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

      {/* Step 5 — Review */}
      {step === 5 && product && (
        <div className="space-y-4">
          <Card>
            <CardHeader><h3 className="font-semibold">Step 5: Review and Post</h3></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-gray-500">Product</span><span className="font-medium">{product.name}</span>
                <span className="text-gray-500">Specs</span><span className="font-medium">{[form.size, form.stock, form.doubleSided ? "Double sided" : "Single sided"].filter(Boolean).join(", ")}</span>
                <span className="text-gray-500">Quantity</span><span className="font-medium">{form.quantity.toLocaleString()}</span>
                <span className="text-gray-500">Turnaround</span><span className="font-medium capitalize">{form.turnaround}</span>
                <span className="text-gray-500">Design</span><span className="font-medium capitalize">{form.designMethod.replace("_", " ")}{selectedTemplateId ? " (template selected)" : ""}</span>
                <span className="text-gray-500">Delivery</span><span className="font-medium">{[form.address, form.city, form.province, form.postalCode].filter(Boolean).join(", ") || "Not set"}</span>
                {form.requestedDate && <><span className="text-gray-500">Deadline</span><span className="font-medium">{new Date(form.requestedDate).toLocaleDateString()}</span></>}
                {form.budgetMax && <><span className="text-gray-500">Budget Cap</span><span className="font-medium">${Number(form.budgetMax).toLocaleString()}</span></>}
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-600">Estimated total</span>
                  <span className="text-2xl font-bold text-gray-900">${estimatedTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">${unitPrice.toFixed(2)} / unit · Shops will bid — final price may differ</p>
              </div>

              {/* Budget warnings */}
              {overBudget && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">Estimated cost exceeds your budget cap of ${Number(form.budgetMax).toLocaleString()}.</p>
                </div>
              )}

              {!budgetLoading && overCampaignBudget && !overBudget && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">Estimated cost exceeds remaining campaign print budget (${totalBudgetRemaining.toLocaleString()} available).</p>
                </div>
              )}

              {!budgetLoading && relevantLines.length > 0 && !overCampaignBudget && (
                <p className="text-xs text-emerald-700">✓ Within campaign print budget — ${totalBudgetRemaining.toLocaleString()} remaining.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => submitJob(false)} loading={posting} className="flex-1">
              Post to Marketplace
            </Button>
            <Button variant="outline" onClick={() => submitJob(true)} loading={posting}>
              Save as Draft
            </Button>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 z-10">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <p className="text-sm text-gray-600">
              Running total: <span className="font-bold text-gray-900">${estimatedTotal.toFixed(2)}</span>
              {form.quantity > 0 && estimatedTotal > 0 && <span className="text-xs text-gray-400 ml-2">(${unitPrice.toFixed(2)}/unit)</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</Button>
              <Button
                disabled={step === 1 && !form.product}
                onClick={() => setStep((s) => Math.min(5, s + 1))}
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
