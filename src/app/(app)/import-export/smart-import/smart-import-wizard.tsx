"use client";
/**
 * Smart Import Wizard — 5 steps
 * Step 1: Upload file (CSV, TSV, Excel) with drag-and-drop
 * Step 2: AI auto-detects column mapping, user corrects
 * Step 3: Preview duplicates — probable count, net-new estimate
 * Step 4: Choose merge strategy: skip duplicates, update existing, create all
 * Step 5: Execute with progress bar + done screen
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, ChevronRight, Check, AlertTriangle, ArrowLeft, X,
  Sparkles, FileSpreadsheet, ShieldCheck, Merge, Play,
} from "lucide-react";
import { Card, CardHeader, CardContent, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnMapping } from "@/lib/import/column-mapper";
import { TARGET_FIELDS } from "@/lib/import/column-mapper";
import { motion, AnimatePresence } from "framer-motion";

/* ── Constants ──────────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const spring = { type: "spring" as const, stiffness: 400, damping: 25 };

interface Props { campaignId: string; }

type Step = "upload" | "map" | "duplicates" | "strategy" | "done";

type MergeStrategy = "skip" | "update" | "create_all";

interface AnalysisResult {
  filename: string;
  fileType: string;
  totalRows: number;
  skippedRows: number;
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  suggestedMappings: Record<string, ColumnMapping>;
  warnings: string[];
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ReviewSummary {
  validRows: number;
  invalidRows: number;
  probableDuplicates: number;
  newRecordsEstimate: number;
}

type TargetEntity = "contacts" | "volunteers" | "documents" | "custom_fields";

interface ImportTemplate {
  id: string;
  name: string;
  targetEntity: TargetEntity;
  mappings: Record<string, string>;
  options?: Record<string, unknown> | null;
  isDefault?: boolean;
}

/* ── Shimmer ────────────────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]", className)}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

/* ── Motion button ──────────────────────────────────────────────────── */

function MButton({
  children, className, onClick, disabled, loading, variant = "default", size = "md", type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: `text-white focus:ring-emerald-400`,
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-emerald-400",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400",
  };
  const sizes = {
    sm: "text-xs px-3 py-1.5 min-h-[36px]",
    md: "text-sm px-4 py-2 min-h-[44px]",
    lg: "text-sm px-5 py-2.5 min-h-[44px]",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      style={variant === "default" ? { backgroundColor: NAVY } : undefined}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Shimmer className="w-4 h-4 rounded-full" />}
      {children}
    </motion.button>
  );
}

/* ── Progress bar ───────────────────────────────────────────────────── */

function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium" style={{ color: NAVY }}>{label}</p>}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: GREEN }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">{Math.round(value)}%</p>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────── */

export default function SmartImportWizard({ campaignId }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, ColumnMapping>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preparingReview, setPreparingReview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetEntity, setTargetEntity] = useState<TargetEntity>("contacts");
  const [builtinTemplates, setBuiltinTemplates] = useState<ImportTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<ImportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("update");
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  const STEPS: Step[] = ["upload", "map", "duplicates", "strategy", "done"];
  const STEP_LABELS = ["Upload", "Map Columns", "Preview", "Strategy", "Done"];
  const STEP_ICONS = [Upload, Sparkles, ShieldCheck, Merge, Check];

  const categoryOrder: Array<(typeof TARGET_FIELDS)[number]["category"]> = [
    "name", "address", "contact", "electoral", "campaign", "other",
  ];
  const categories = useMemo(() => {
    const known = categoryOrder.filter((cat) => TARGET_FIELDS.some((f) => f.category === cat));
    const extras = Array.from(new Set(TARGET_FIELDS.map((f) => f.category))).filter((cat) => !known.includes(cat));
    return [...known, ...extras];
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch(`/api/import/templates?campaignId=${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      setBuiltinTemplates(data?.data?.builtin ?? []);
      setCustomTemplates(data?.data?.custom ?? []);
    } catch { /* non-blocking */ }
  }

  useEffect(() => { loadTemplates(); }, [campaignId]);

  const allTemplates = useMemo(() => [...builtinTemplates, ...customTemplates], [builtinTemplates, customTemplates]);

  function normalizeKey(value: string) {
    return value.toLowerCase().replace(/[\s\-\.]/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  function applyTemplate(template: ImportTemplate) {
    if (!analysis) return;
    const byNormalizedHeader = new Map<string, string>();
    for (const header of analysis.rawHeaders) byNormalizedHeader.set(normalizeKey(header), header);

    const next = { ...mappings };
    for (const [source, target] of Object.entries(template.mappings ?? {})) {
      const direct = analysis.rawHeaders.find((h) => h === source);
      const normalized = byNormalizedHeader.get(normalizeKey(source));
      const header = direct ?? normalized;
      if (!header || !target) continue;
      next[header] = {
        ...next[header],
        sourceColumn: header,
        targetField: target,
        confidence: 100,
        method: "manual",
        alternatives: next[header]?.alternatives ?? [],
      };
    }
    setMappings(next);
    setTargetEntity(template.targetEntity);
    setSelectedTemplateId(template.id);
    toast.success(`Applied template: ${template.name}`);
  }

  async function saveCurrentTemplate() {
    if (!analysis) return;
    const name = window.prompt("Template name");
    if (!name?.trim()) return;

    const mappingConfig = Object.fromEntries(
      Object.entries(mappings).filter(([, m]) => m.targetField).map(([src, m]) => [src, m.targetField!])
    );

    try {
      const res = await fetch("/api/import/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: name.trim(), targetEntity, mappings: mappingConfig }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Failed to save template"); return; }
      toast.success("Template saved");
      await loadTemplates();
    } catch { toast.error("Failed to save template"); }
  }

  async function deleteSelectedTemplate() {
    const template = customTemplates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    try {
      const res = await fetch(`/api/import/templates/${template.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Failed to delete template"); return; }
      setSelectedTemplateId("");
      toast.success("Template deleted");
      await loadTemplates();
    } catch { toast.error("Failed to delete template"); }
  }

  // Step 1: Upload and analyze
  async function handleFile(f: File) {
    setFile(f);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("campaignId", campaignId);
      const res = await fetch("/api/import/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to analyze file"); return; }
      setAnalysis(data.data);
      setMappings(data.data.suggestedMappings);
      setReviewSummary(null);
      setStep("map");
    } catch { toast.error("Failed to read file"); }
    finally { setLoading(false); }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [campaignId]);

  // Step 3: Prepare duplicate review
  async function prepareReview() {
    if (!file) return;
    const mappingConfig = Object.fromEntries(
      Object.entries(mappings).filter(([, m]) => m.targetField).map(([src, m]) => [src, m.targetField!])
    );

    setPreparingReview(true);
    try {
      const cleanForm = new FormData();
      cleanForm.append("file", file);
      cleanForm.append("campaignId", campaignId);
      cleanForm.append("mappings", JSON.stringify(mappingConfig));

      const cleanRes = await fetch("/api/import/clean", { method: "POST", body: cleanForm });
      const cleanData = await cleanRes.json();
      if (!cleanRes.ok) { toast.error(cleanData.error ?? "Failed to clean import rows"); return; }

      const dupForm = new FormData();
      dupForm.append("file", file);
      dupForm.append("campaignId", campaignId);
      dupForm.append("mappings", JSON.stringify(mappingConfig));

      const dupRes = await fetch("/api/import/duplicates", { method: "POST", body: dupForm });
      const dupData = await dupRes.json();
      if (!dupRes.ok) { toast.error(dupData.error ?? "Failed duplicate check"); return; }

      setReviewSummary({
        validRows: cleanData.data.validRows,
        invalidRows: cleanData.data.invalidRows,
        probableDuplicates: dupData.data.probableDuplicates,
        newRecordsEstimate: dupData.data.newRecordsEstimate,
      });
      setStep("duplicates");
    } finally { setPreparingReview(false); }
  }

  // Step 5: Run the actual import
  async function runImport() {
    if (!analysis || !file) return;
    setImporting(true);
    setImportProgress(0);

    try {
      const mappingConfig = Object.fromEntries(
        Object.entries(mappings).filter(([, m]) => m.targetField).map(([src, m]) => [src, m.targetField!])
      );

      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      form.append("mappings", JSON.stringify(mappingConfig));
      form.append("mergeStrategy", mergeStrategy);

      // Contacts → background queue so large voter files (5k–25k rows) never hit Vercel timeout
      if (targetEntity === "contacts") {
        const queueRes = await fetch("/api/import/background", { method: "POST", body: form });
        const queueData = await queueRes.json();
        if (!queueRes.ok) { toast.error(queueData.error ?? "Failed to queue import"); return; }

        const jobId = queueData.jobId as string;

        // Poll real progress every 2 s until job finishes
        await new Promise<void>((resolve, reject) => {
          const poll = setInterval(async () => {
            try {
              const pRes = await fetch(`/api/import/progress?id=${jobId}`);
              const pData = await pRes.json();
              if (!pRes.ok) { clearInterval(poll); reject(new Error(pData.error ?? "Progress check failed")); return; }
              setImportProgress(pData.progressPct ?? 0);
              if (["completed", "completed_with_errors", "failed"].includes(pData.status)) {
                clearInterval(poll);
                setImportProgress(100);
                setImportResult({
                  imported: pData.importedCount ?? 0,
                  updated: pData.updatedCount ?? 0,
                  skipped: pData.skippedCount ?? 0,
                  errors: pData.errors ?? [],
                });
                resolve();
              }
            } catch (e) { clearInterval(poll); reject(e); }
          }, 2000);
        });

        await new Promise(r => setTimeout(r, 600));
        setStep("done");
        return;
      }

      // Volunteers / documents — smaller lists, synchronous path is fine
      const endpointByEntity: Record<TargetEntity, string | null> = {
        contacts: null, // handled above
        volunteers: "/api/import/volunteers/execute",
        documents: "/api/import/documents/execute",
        custom_fields: null,
      };
      const endpoint = endpointByEntity[targetEntity];
      if (!endpoint) { toast.error("This import type is not enabled yet."); return; }

      const progressInterval = setInterval(() => {
        setImportProgress(prev => (prev >= 90 ? prev : prev + Math.random() * 15));
      }, 400);
      try {
        const importRes = await fetch(endpoint, { method: "POST", body: form });
        const importData = await importRes.json();
        if (!importRes.ok) { toast.error(importData.error ?? "Import failed"); return; }
        setImportProgress(100);
        setImportResult(importData.data);
        await new Promise(r => setTimeout(r, 600));
        setStep("done");
      } finally {
        clearInterval(progressInterval);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const mappedCount = Object.values(mappings).filter(m => m.targetField).length;
  const totalCols = Object.keys(mappings).length;
  const highConfidence = Object.values(mappings).filter(m => m.confidence >= 85 && m.targetField).length;

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-2xl space-y-5"
    >
      {/* Progress steps */}
      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[i];
          const isComplete = currentStepIdx > i;
          const isCurrent = step === s;
          return (
            <div key={s} className="flex items-center gap-1 sm:gap-2 flex-1">
              <motion.div
                animate={{
                  backgroundColor: isComplete ? GREEN : isCurrent ? NAVY : "#e5e7eb",
                  color: isComplete || isCurrent ? "#fff" : "#9ca3af",
                }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              >
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </motion.div>
              <span className={cn("text-xs font-medium hidden sm:block", isCurrent ? "text-gray-900" : "text-gray-400")}>
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: isComplete ? GREEN : "#e5e7eb" }} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Upload ─────────────────────────────────────────── */}
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Card className="overflow-hidden">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: NAVY }}>Upload your voter list</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Any format works — Excel, CSV, tab-separated, pipe-delimited. We will figure it out.
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={spring}
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center gap-4 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                    isDragOver ? "scale-[1.02]" : ""
                  )}
                  style={{
                    borderColor: isDragOver ? GREEN : "#d1d5db",
                    backgroundColor: isDragOver ? `${GREEN}08` : "transparent",
                  }}
                >
                  {loading ? (
                    <div className="space-y-3 w-full max-w-xs">
                      <Shimmer className="h-4 w-full" />
                      <Shimmer className="h-4 w-3/4" />
                      <Shimmer className="h-4 w-1/2" />
                      <p className="text-sm font-medium text-center" style={{ color: GREEN }}>Analyzing your file...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${GREEN}12` }}>
                        <Upload className={cn("w-7 h-7")} style={{ color: isDragOver ? GREEN : "#9ca3af" }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">Drop your file here, or tap to browse</p>
                        <p className="text-xs text-gray-400 mt-1">CSV, Excel (.xlsx), TSV, pipe-delimited</p>
                      </div>
                    </>
                  )}
                  <input ref={fileRef} type="file" className="hidden"
                    accept=".csv,.xlsx,.xls,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </motion.div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What we handle automatically</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    {["Any column naming convention", "Missing or inconsistent headers", "Duplicate contacts", "Phone lists + voter lists merged", "Name variants (Bob = Robert)", "Encoding issues"].map(item => (
                      <div key={item} className="flex items-center gap-2 min-h-[32px]">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />{item}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Step 2: Column Mapping ─────────────────────────────────── */}
        {step === "map" && analysis && (
          <motion.div key="map" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}12` }}>
                    <Sparkles className="w-4 h-4" style={{ color: GREEN }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>
                      AI mapped {mappedCount} of {totalCols} columns — {highConfidence} with high confidence
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Review and adjust any mappings below. Columns set to &quot;Skip&quot; will not be imported.
                    </p>
                  </div>
                </div>
                {analysis.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {analysis.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <div className="text-[11px] rounded-lg px-3 py-2" style={{ color: GREEN, backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                    Enterprise dedupe active: fuzzy name + nickname + phone/email reconciliation.
                  </div>
                  <Select
                    value={targetEntity}
                    onChange={(e) => setTargetEntity(e.target.value as TargetEntity)}
                    className="text-xs min-h-[44px]"
                  >
                    <option value="contacts">Target: Contacts</option>
                    <option value="volunteers">Target: Volunteers</option>
                    <option value="documents">Target: Documents</option>
                    <option value="custom_fields">Target: Custom Fields</option>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      if (!id) return;
                      const template = allTemplates.find((t) => t.id === id);
                      if (template) applyTemplate(template);
                    }}
                    className="text-xs min-w-[230px] min-h-[44px]"
                  >
                    <option value="">Apply template...</option>
                    {builtinTemplates.length > 0 && (
                      <optgroup label="Built-in">
                        {builtinTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    )}
                    {customTemplates.length > 0 && (
                      <optgroup label="Campaign">
                        {customTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    )}
                  </Select>
                  <MButton variant="outline" onClick={saveCurrentTemplate}>Save as Template</MButton>
                  <MButton variant="outline" onClick={deleteSelectedTemplate} disabled={!customTemplates.some((t) => t.id === selectedTemplateId)}>
                    <X className="w-4 h-4" /> Delete
                  </MButton>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm" style={{ color: NAVY }}>Column Mapping</h3>
                  <span className="text-xs text-gray-400">{analysis.totalRows.toLocaleString()} rows</span>
                </div>
              </CardHeader>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {analysis.rawHeaders.map((header) => {
                  const mapping = mappings[header];
                  const confidence = mapping?.confidence ?? 0;
                  return (
                    <div key={header} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                      <div className="w-28 sm:w-36 flex-shrink-0">
                        <p className="text-xs font-mono font-medium text-gray-700 truncate">{header}</p>
                        {mapping?.sampleValues && (
                          <p className="text-xs text-gray-400 truncate">e.g. {String(mapping.sampleValues)}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="flex-1">
                        <Select
                          value={mapping?.targetField ?? ""}
                          onChange={(e) => setMappings(prev => ({
                            ...prev,
                            [header]: { ...prev[header], targetField: e.target.value || null, confidence: 100, method: "manual" }
                          }))}
                          className="text-xs min-h-[44px]"
                        >
                          <option value="">— Skip this column —</option>
                          {categories.map(cat => (
                            <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                              {TARGET_FIELDS.filter(f => f.category === cat).map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </Select>
                      </div>
                      <div className="w-16 flex-shrink-0 text-right">
                        {mapping?.targetField ? (
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                            confidence >= 85 ? "bg-emerald-100 text-emerald-700" :
                            confidence >= 60 ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700")}>
                            {mapping.method === "manual" ? "OK" : `${confidence}%`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">skip</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Sample data preview */}
            {analysis.sampleRows.length > 0 && (
              <Card>
                <CardHeader><h3 className="font-semibold text-sm" style={{ color: NAVY }}>Preview (first {analysis.sampleRows.length} rows)</h3></CardHeader>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {analysis.rawHeaders.slice(0, 6).map(h => (
                          <th key={h} className="px-3 py-2 text-left text-gray-600 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {analysis.sampleRows.map((row, i) => (
                        <tr key={i}>
                          {analysis.rawHeaders.slice(0, 6).map(h => (
                            <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              <MButton variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="w-4 h-4" /> Back
              </MButton>
              <MButton onClick={prepareReview} loading={preparingReview} className="flex-1">
                Preview Duplicates <ChevronRight className="w-4 h-4" />
              </MButton>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Duplicate Preview ──────────────────────────────── */}
        {step === "duplicates" && analysis && (
          <motion.div key="duplicates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card>
              <CardContent className="py-5 space-y-4">
                <h2 className="text-lg font-bold" style={{ color: NAVY }}>Duplicate Preview</h2>
                <p className="text-sm text-gray-500">
                  We scanned your file for contacts that already exist in your campaign.
                </p>

                {preparingReview ? (
                  <div className="space-y-3">
                    <Shimmer className="h-16 w-full rounded-xl" />
                    <Shimmer className="h-16 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Valid rows", value: (reviewSummary?.validRows ?? analysis.totalRows).toLocaleString(), color: GREEN },
                      { label: "Columns mapped", value: `${mappedCount} / ${totalCols}`, color: GREEN },
                      { label: "Probable duplicates", value: (reviewSummary?.probableDuplicates ?? 0).toLocaleString(), color: "#f59e0b" },
                      { label: "Net-new estimate", value: (reviewSummary?.newRecordsEstimate ?? analysis.totalRows).toLocaleString(), color: NAVY },
                    ].map(({ label, value, color }) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-xl p-4"
                      >
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-xl font-bold" style={{ color }}>{value}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {reviewSummary && reviewSummary.invalidRows > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {reviewSummary.invalidRows} row(s) have issues and will be skipped during import.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <MButton variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="w-4 h-4" /> Back
              </MButton>
              <MButton onClick={() => setStep("strategy")} className="flex-1">
                Choose Merge Strategy <ChevronRight className="w-4 h-4" />
              </MButton>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Merge Strategy ─────────────────────────────────── */}
        {step === "strategy" && analysis && (
          <motion.div key="strategy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Card>
              <CardContent className="py-5 space-y-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: NAVY }}>Merge Strategy</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    How should we handle the {reviewSummary?.probableDuplicates ?? 0} probable duplicates?
                  </p>
                </div>

                <div className="space-y-3">
                  {([
                    {
                      key: "skip" as MergeStrategy,
                      title: "Skip duplicates",
                      desc: "Only import net-new contacts. Existing records remain untouched.",
                      badge: "Safest",
                      badgeColor: GREEN,
                    },
                    {
                      key: "update" as MergeStrategy,
                      title: "Update existing",
                      desc: "Import new contacts and update matching records with incoming data. Empty fields are not overwritten.",
                      badge: "Recommended",
                      badgeColor: NAVY,
                    },
                    {
                      key: "create_all" as MergeStrategy,
                      title: "Create all",
                      desc: "Import every row as a new contact, even if duplicates exist. May create duplicate records.",
                      badge: "Use with caution",
                      badgeColor: "#f59e0b",
                    },
                  ]).map(option => (
                    <motion.button
                      key={option.key}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={spring}
                      onClick={() => setMergeStrategy(option.key)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-colors min-h-[44px]",
                        mergeStrategy === option.key
                          ? "bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                      style={mergeStrategy === option.key ? { borderColor: GREEN } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center")}
                            style={{ borderColor: mergeStrategy === option.key ? GREEN : "#d1d5db" }}
                          >
                            {mergeStrategy === option.key && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: GREEN }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: NAVY }}>{option.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                          style={{ backgroundColor: option.badgeColor }}
                        >
                          {option.badge}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Summary box */}
                <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                  <p className="font-semibold mb-1" style={{ color: NAVY }}>What happens next:</p>
                  <ul className="space-y-1 text-gray-600 text-xs">
                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} /> {analysis.totalRows.toLocaleString()} rows will be processed</li>
                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} /> {mappedCount} columns mapped to target fields</li>
                    {mergeStrategy === "skip" && <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} /> Duplicates will be skipped entirely</li>}
                    {mergeStrategy === "update" && <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} /> Existing records will be enriched with new data</li>}
                    {mergeStrategy === "create_all" && <li className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" /> All rows will be created as new contacts</li>}
                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} /> Invalid rows are skipped and logged</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <MButton variant="outline" onClick={() => setStep("duplicates")}>
                <ArrowLeft className="w-4 h-4" /> Back
              </MButton>
              <MButton onClick={runImport} loading={importing} className="flex-1">
                <Play className="w-4 h-4" /> Import {analysis.totalRows.toLocaleString()} Rows
              </MButton>
            </div>

            {/* Progress bar during import */}
            <AnimatePresence>
              {importing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <ProgressBar value={importProgress} label="Importing contacts..." />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Step 5: Done ───────────────────────────────────────────── */}
        {step === "done" && importResult && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card>
              <CardContent className="py-10 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring, delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${GREEN}15` }}
                >
                  <Check className="w-8 h-8" style={{ color: GREEN }} />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: NAVY }}>Import complete</h2>
                  <p className="text-sm text-gray-500 mt-1">Your contacts are ready to use.</p>
                </div>
                <div className="flex gap-4 justify-center">
                  {[
                    { label: "Imported", value: importResult.imported, color: GREEN },
                    { label: "Updated", value: importResult.updated, color: NAVY },
                    { label: "Skipped", value: importResult.skipped, color: "#9ca3af" },
                  ].map(({ label, value, color }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="text-center px-4"
                    >
                      <p className="text-3xl font-black" style={{ color }}>{value}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </motion.div>
                  ))}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-left bg-amber-50 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-semibold text-amber-700">{importResult.errors.length} rows had issues:</p>
                    {importResult.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-amber-600">{e}</p>)}
                    {importResult.errors.length > 5 && <p className="text-xs text-amber-500">and {importResult.errors.length - 5} more...</p>}
                  </div>
                )}
                <div className="flex gap-3 justify-center flex-wrap">
                  <MButton variant="outline" onClick={() => { setStep("upload"); setAnalysis(null); setImportResult(null); setFile(null); setImportProgress(0); }}>
                    Import another file
                  </MButton>
                  <MButton onClick={() => { window.location.href = "/contacts"; }}>
                    View Contacts
                  </MButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
