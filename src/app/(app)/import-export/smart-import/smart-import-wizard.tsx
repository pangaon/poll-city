"use client";
/**
 * Smart Import Wizard
 * Step 1: Drop any file → instant parse
 * Step 2: Review AI column mapping → adjust if needed
 * Step 3: Review matches/duplicates → confirm import
 *
 * Designed for non-technical campaign volunteers.
 * The hard work happens invisibly in the engine.
 */
import { useState, useRef, useCallback } from "react";
import { Upload, ChevronRight, Check, AlertTriangle, RefreshCw, ArrowLeft, X, Sparkles } from "lucide-react";
import { Button, Card, CardHeader, CardContent, Select, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ColumnMapping } from "@/lib/import/column-mapper";
import { TARGET_FIELDS } from "@/lib/import/column-mapper";

interface Props { campaignId: string; }

type Step = "upload" | "map" | "review" | "done";

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

  async function prepareReview() {
    if (!file) return;

    const mappingConfig = Object.fromEntries(
      Object.entries(mappings)
        .filter(([, m]) => m.targetField)
        .map(([src, m]) => [src, m.targetField!])
    );

    setPreparingReview(true);
    try {
      const cleanForm = new FormData();
      cleanForm.append("file", file);
      cleanForm.append("campaignId", campaignId);
      cleanForm.append("mappings", JSON.stringify(mappingConfig));

      const cleanRes = await fetch("/api/import/clean", { method: "POST", body: cleanForm });
      const cleanData = await cleanRes.json();
      if (!cleanRes.ok) {
        toast.error(cleanData.error ?? "Failed to clean import rows");
        return;
      }

      const dupForm = new FormData();
      dupForm.append("file", file);
      dupForm.append("campaignId", campaignId);
      dupForm.append("mappings", JSON.stringify(mappingConfig));

      const dupRes = await fetch("/api/import/duplicates", { method: "POST", body: dupForm });
      const dupData = await dupRes.json();
      if (!dupRes.ok) {
        toast.error(dupData.error ?? "Failed duplicate check");
        return;
      }

      setReviewSummary({
        validRows: cleanData.data.validRows,
        invalidRows: cleanData.data.invalidRows,
        probableDuplicates: dupData.data.probableDuplicates,
        newRecordsEstimate: dupData.data.newRecordsEstimate,
      });
      setStep("review");
    } finally {
      setPreparingReview(false);
    }
  }

  // Step 4: Run the actual import
  async function runImport() {
    if (!analysis || !file) return;
    setLoading(true);
    try {
      const mappingConfig = Object.fromEntries(
        Object.entries(mappings)
          .filter(([, m]) => m.targetField)
          .map(([src, m]) => [src, m.targetField!])
      );

      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      form.append("mappings", JSON.stringify(mappingConfig));

      const importRes = await fetch("/api/import/execute", { method: "POST", body: form });
      const importData = await importRes.json();
      if (!importRes.ok) { toast.error(importData.error ?? "Import failed"); return; }
      setImportResult(importData.data);
      setStep("done");
    } finally { setLoading(false); }
  }

  const mappedCount = Object.values(mappings).filter(m => m.targetField).length;
  const totalCols = Object.keys(mappings).length;
  const highConfidence = Object.values(mappings).filter(m => m.confidence >= 85 && m.targetField).length;

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {(["upload", "map", "review", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
              step === s ? "bg-blue-600 text-white" :
              ["upload","map","review","done"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500")}>
              {["upload","map","review","done"].indexOf(step) > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", step === s ? "text-blue-600" : "text-gray-400")}>
              {["Upload", "Map Columns", "Review", "Done"][i]}
            </span>
            {i < 3 && <div className={cn("flex-1 h-0.5", ["upload","map","review","done"].indexOf(step) > i ? "bg-emerald-400" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ───────────────────────────────────────────────────── */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload your voter list</h2>
              <p className="text-sm text-gray-500 mt-1">
                Any format works — Excel, CSV, tab-separated, pipe-delimited. We'll figure it out.
              </p>
            </div>

            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex flex-col items-center gap-4 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                isDragOver ? "border-blue-400 bg-blue-50 scale-[1.02]" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-sm font-medium text-blue-600">Analyzing your file…</p>
                </>
              ) : (
                <>
                  <Upload className={cn("w-10 h-10", isDragOver ? "text-blue-500" : "text-gray-400")} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Drop your file here, or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">CSV, Excel (.xlsx), TSV, pipe-delimited — any voter file format</p>
                  </div>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden"
                accept=".csv,.xlsx,.xls,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What we handle automatically</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
                {["Any column naming convention", "Missing or inconsistent headers", "Duplicate contacts", "Phone lists + voter lists merged", "Name variants (Bob = Robert)", "Encoding issues"].map(item => (
                  <div key={item} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />{item}</div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Column Mapping ────────────────────────────────────────────── */}
      {step === "map" && analysis && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    AI mapped {mappedCount} of {totalCols} columns — {highConfidence} with high confidence
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and adjust any mappings below. Columns set to "Skip" won't be imported.
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Column Mapping</h3>
                <span className="text-xs text-gray-400">{analysis.totalRows.toLocaleString()} rows · {analysis.filename}</span>
              </div>
            </CardHeader>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {analysis.rawHeaders.map((header) => {
                const mapping = mappings[header];
                const confidence = mapping?.confidence ?? 0;
                return (
                  <div key={header} className="flex items-center gap-3 px-5 py-3">
                    {/* Source column */}
                    <div className="w-36 flex-shrink-0">
                      <p className="text-xs font-mono font-medium text-gray-700 truncate">{header}</p>
                      {mapping?.sampleValues && (
                        <p className="text-xs text-gray-400 truncate">e.g. {String(mapping.sampleValues)}</p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />

                    {/* Target field selector */}
                    <div className="flex-1">
                      <Select
                        value={mapping?.targetField ?? ""}
                        onChange={(e) => setMappings(prev => ({
                          ...prev,
                          [header]: { ...prev[header], targetField: e.target.value || null, confidence: 100, method: "manual" }
                        }))}
                        className="text-xs"
                      >
                        <option value="">— Skip this column —</option>
                        {["name", "address", "contact", "electoral", "campaign"].map(cat => (
                          <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                            {TARGET_FIELDS.filter(f => f.category === cat).map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </div>

                    {/* Confidence badge */}
                    <div className="w-16 flex-shrink-0 text-right">
                      {mapping?.targetField ? (
                        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full",
                          confidence >= 85 ? "bg-emerald-100 text-emerald-700" :
                          confidence >= 60 ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700")}>
                          {mapping.method === "manual" ? "✓" : `${confidence}%`}
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
              <CardHeader><h3 className="font-semibold text-sm text-gray-900">Preview (first {analysis.sampleRows.length} rows)</h3></CardHeader>
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
            <Button variant="outline" onClick={() => setStep("upload")}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={prepareReview} loading={preparingReview} className="flex-1">
              Review Import ({analysis.totalRows.toLocaleString()} contacts) <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Confirm ─────────────────────────────────────────── */}
      {step === "review" && analysis && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Ready to import</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total contacts", value: (reviewSummary?.validRows ?? analysis.totalRows).toLocaleString(), color: "text-blue-600" },
                  { label: "Columns mapped", value: `${mappedCount} / ${totalCols}`, color: "text-emerald-600" },
                  { label: "Probable duplicates", value: reviewSummary?.probableDuplicates ?? 0, color: "text-amber-600" },
                  { label: "Invalid rows", value: reviewSummary?.invalidRows ?? analysis.skippedRows, color: "text-gray-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={cn("text-lg font-bold", color)}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">What happens next:</p>
                <ul className="space-y-0.5 text-blue-700">
                  <li>✓ New contacts are added to your campaign</li>
                  <li>✓ Likely duplicates are updated to avoid double records</li>
                  <li>✓ Invalid rows are skipped and logged in import history</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("map")}><ArrowLeft className="w-4 h-4" />Back</Button>
            <Button onClick={runImport} loading={loading} className="flex-1">
              Import {analysis.totalRows.toLocaleString()} Contacts
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ────────────────────────────────────────────────────── */}
      {step === "done" && importResult && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import complete</h2>
              <p className="text-sm text-gray-500 mt-1">Your contacts are ready to use.</p>
            </div>
            <div className="flex gap-3 justify-center">
              {[
                { label: "Imported", value: importResult.imported, color: "text-emerald-600" },
                { label: "Updated", value: importResult.updated, color: "text-blue-600" },
                { label: "Skipped", value: importResult.skipped, color: "text-gray-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center px-4">
                  <p className={cn("text-2xl font-black", color)}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div className="text-left bg-amber-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-amber-700">{importResult.errors.length} rows had issues:</p>
                {importResult.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-amber-600">{e}</p>)}
                {importResult.errors.length > 5 && <p className="text-xs text-amber-500">and {importResult.errors.length - 5} more…</p>}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep("upload"); setAnalysis(null); setImportResult(null); setFile(null); }}>
                Import another file
              </Button>
              <Button onClick={() => window.location.href = "/contacts"}>
                View Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
