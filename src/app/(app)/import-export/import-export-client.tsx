"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle, History,
  Link2, FileSpreadsheet, Users, MapPin,
  ClipboardList, ArrowUpFromLine, ArrowDownToLine, RotateCcw, Clock,
} from "lucide-react";
import { Card, CardHeader, CardContent, Select, Badge, EmptyState } from "@/components/ui";
import { TARGET_FIELDS } from "@/lib/import/column-mapper";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ExportPanel from "./export-panel";

/* ── Constants ──────────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const spring = { type: "spring" as const, stiffness: 400, damping: 25 };

interface Props {
  campaignId: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface MappingCandidate {
  targetField: string | null;
  confidence: number;
}

interface FieldStats {
  totalRows: number;
  withName: number;
  withPhone: number;
  withEmail: number;
  withAddress: number;
  withPollNumber: number;
  withPostalCode: number;
  phonePercent: number;
  emailPercent: number;
  addressPercent: number;
}

interface AnalyzeResponse {
  filename: string;
  fileType: string;
  totalRows: number;
  skippedRows: number;
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  suggestedMappings: Record<string, MappingCandidate>;
  warnings: string[];
  // Intelligence fields
  detectedFormat?: string;
  detectedFormatLabel?: string | null;
  detectedFormatDescription?: string | null;
  formatConfidence?: number;
  autoConfidence?: number;
  hasNameField?: boolean;
  fieldStats?: FieldStats;
  previewRows?: Array<Record<string, string>>;
  existingContactCount?: number;
}

interface DuplicatePreview {
  checkedRows: number;
  probableDuplicates: number;
  newRecordsEstimate: number;
  duplicateSamples: Array<{
    rowIndex: number;
    incoming: { firstName: string; lastName: string; email?: string; phone?: string };
    existing: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  }>;
}

interface PhoneMatchPreview {
  summary: {
    totalMatches?: number;
    voterRows: number;
    phoneRows: number;
    autoMerged: number;
    needsReview: number;
    unmatched: number;
    highConfidence: number;
    mediumConfidence: number;
    eligibleAtThreshold?: number;
  };
  samples: Array<{
    rowIndex: number;
    action: string;
    confidence: string;
    score: number;
    matchedOn: string[];
    eligibleByThreshold?: boolean;
    voter: { firstName?: string; lastName?: string; phone?: string; email?: string };
    phoneRecord: { firstName?: string; lastName?: string; phone?: string; email?: string };
  }>;
}

interface PhoneApplyResult {
  considered: number;
  created: number;
  updated: number;
  skipped: number;
  applied: number;
  strategy: string;
  threshold: number;
  scope?: string;
  allowCreateFromUnmatched?: boolean;
}

interface ParsedFile {
  filename: string;
  fileType: string;
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  allRows: Record<string, string>[];
  totalRows: number;
}

interface ImportHistoryItem {
  id: string;
  filename: string;
  status: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  createdAt: string;
  rollbackDeadline?: string | null;
}

const CSV_HEADERS = [
  "firstName", "lastName", "email", "phone", "address1", "address2",
  "city", "province", "postalCode", "ward", "riding", "supportLevel",
  "issues", "signRequested", "volunteerInterest", "doNotContact", "notes",
];


const categoryOrder = ["name", "address", "contact", "electoral", "campaign", "other"] as const;

function groupedFields() {
  return categoryOrder.map((category) => ({
    category,
    fields: TARGET_FIELDS.filter((field) => field.category === category),
  }));
}

/* ── Shimmer skeleton ─────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]", className)}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

/* ── Motion button ────────────────────────────────────────────────── */

function MButton({
  children, className, onClick, disabled, loading, variant = "default", size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
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

/* ── Import countdown timer ───────────────────────────────────────── */

function ImportCountdown({ deadline }: { deadline: string }) {
  const [ms, setMs] = useState(() => Math.max(0, new Date(deadline).getTime() - Date.now()));

  useEffect(() => {
    if (ms <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, new Date(deadline).getTime() - Date.now());
      setMs(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 30_000);
    return () => clearInterval(id);
  }, [deadline, ms]);

  if (ms <= 0) return null;

  const hours   = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  return (
    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold tabular-nums">
      <Clock className="w-3 h-3 flex-shrink-0" />
      {hours}h {minutes}m left
    </span>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export default function ImportExportClient({ campaignId }: Props) {
  const groups = useMemo(groupedFields, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const phoneFileRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const [phoneFile, setPhoneFile] = useState<File | null>(null);
  const [phoneAnalysis, setPhoneAnalysis] = useState<AnalyzeResponse | null>(null);
  const [phoneMappings, setPhoneMappings] = useState<Record<string, string>>({});

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingPhone, setAnalyzingPhone] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [matchingPhoneList, setMatchingPhoneList] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragMainActive, setDragMainActive] = useState(false);
  const [dragPhoneActive, setDragPhoneActive] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);

  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePreview | null>(null);
  const [phoneMatch, setPhoneMatch] = useState<PhoneMatchPreview | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [rollingBack, setRollingBack] = useState<Set<string>>(new Set());
  const [useAiMatch, setUseAiMatch] = useState(true);
  const [matchMode, setMatchMode] = useState<"strict" | "balanced" | "aggressive">("balanced");
  const [applyConfidenceThreshold, setApplyConfidenceThreshold] = useState(80);
  const [applyStrategy, setApplyStrategy] = useState<"threshold" | "selected" | "selected_or_threshold">("selected_or_threshold");
  const [applyScope, setApplyScope] = useState<"preview_sample" | "all_matches">("preview_sample");
  const [allowCreateFromUnmatched, setAllowCreateFromUnmatched] = useState(false);
  const [selectedMatchRows, setSelectedMatchRows] = useState<number[]>([]);
  const [applyingMatchRows, setApplyingMatchRows] = useState(false);
  const [phoneApplyResult, setPhoneApplyResult] = useState<PhoneApplyResult | null>(null);

  const [activeTab, setActiveTab] = useState<"import" | "export">("import");

  const mappingHealth = useMemo(() => {
    if (!analysis) return { mapped: 0, total: 0, hasNameField: false };
    const mapped = Object.values(mappings).length;
    const total = analysis.rawHeaders.length;
    const targets = new Set(Object.values(mappings));
    const hasNameField = targets.has("firstName") || targets.has("lastName");
    return { mapped, total, hasNameField };
  }, [analysis, mappings]);

  useEffect(() => {
    void loadImportHistory();
  }, [campaignId]);


  async function loadImportHistory() {
    try {
      const res = await fetch(`/api/import/history?campaignId=${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(Array.isArray(data?.data) ? data.data : []);
    } catch { /* Non-blocking */ }
  }

  async function handleRollback(importLogId: string, filename: string) {
    if (!confirm(`Roll back all contacts from "${filename}"? They will be moved to the Recycle Bin.`)) return;
    setRollingBack((prev) => new Set(prev).add(importLogId));
    try {
      const res = await fetch("/api/import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importLogId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message ?? "Import rolled back successfully");
        await loadImportHistory();
      } else {
        toast.error(json.error ?? "Failed to roll back import");
      }
    } catch {
      toast.error("Network error during rollback");
    } finally {
      setRollingBack((prev) => { const s = new Set(prev); s.delete(importLogId); return s; });
    }
  }

  function buildMappingsFromAnalysis(next: AnalyzeResponse): Record<string, string> {
    const auto: Record<string, string> = {};
    for (const sourceColumn of next.rawHeaders) {
      const mapping = next.suggestedMappings[sourceColumn];
      if (!mapping?.targetField) continue;
      if (mapping.confidence < 45) continue;
      auto[sourceColumn] = mapping.targetField;
    }
    return auto;
  }

  async function parseFileInBrowser(file: File): Promise<ParsedFile> {
    if (/\.(xls|xlsx)$/i.test(file.name)) {
      const XLSX = (await import("xlsx")).default;
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { raw: false });
      if (wb.SheetNames.length > 1) {
        toast(`Your file has ${wb.SheetNames.length} sheets. Importing the first sheet: "${wb.SheetNames[0]}".`, { duration: 6000 });
      }
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (allData.length === 0) throw new Error("No data found in spreadsheet");
      const rawHeaders = Object.keys(allData[0]);
      const allRows = allData.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? "")]))
      ) as Record<string, string>[];
      return {
        filename: file.name,
        fileType: "excel",
        rawHeaders,
        sampleRows: allRows.slice(0, 50),
        allRows,
        totalRows: allRows.length,
      };
    } else {
      // CSV / TSV
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      if (nonEmpty.length < 2) throw new Error("File appears to be empty");
      const firstLine = nonEmpty[0];
      const delimiter = firstLine.includes("\t") ? "\t" : ",";
      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let field = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              field += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === delimiter && !inQuotes) {
            result.push(field.trim());
            field = "";
          } else {
            field += ch;
          }
        }
        result.push(field.trim());
        return result;
      };
      const rawHeaders = parseRow(firstLine);
      const allRows = nonEmpty.slice(1).map((line) => {
        const vals = parseRow(line);
        const row: Record<string, string> = {};
        rawHeaders.forEach((h, i) => {
          row[h] = vals[i] ?? "";
        });
        return row;
      });
      return {
        filename: file.name,
        fileType: delimiter === "\t" ? "tsv" : "csv",
        rawHeaders,
        sampleRows: allRows.slice(0, 50),
        allRows,
        totalRows: allRows.length,
      };
    }
  }

  async function analyzeFile(file: File, forPhoneList = false) {
    if (forPhoneList) setAnalyzingPhone(true);
    else { setAnalyzing(true); setResult(null); setDuplicates(null); setShowAdvancedMapping(false); }

    try {
      // Parse in browser — no file size limit
      let parsed: ParsedFile;
      try {
        parsed = await parseFileInBrowser(file);
      } catch (parseErr) {
        toast.error(
          `Could not read file: ${parseErr instanceof Error ? parseErr.message : "Unknown error"}. ` +
          "Check the file isn't password-protected or corrupted.",
          { duration: 8000 },
        );
        return;
      }

      if (!forPhoneList) setParsedFile(parsed);

      // Send only headers + sample rows as JSON — tiny payload, no upload size limit
      let payload: { data?: AnalyzeResponse; error?: string } = {};
      try {
        const res = await fetch("/api/import/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            filename: file.name,
            fileType: parsed.fileType,
            totalRows: parsed.totalRows,
            rawHeaders: parsed.rawHeaders,
            sampleRows: parsed.sampleRows,
          }),
        });
        try {
          payload = await res.json();
        } catch {
          toast.error(`Server error (${res.status}). Try again or contact support.`);
          return;
        }
        if (!res.ok || !payload?.data) {
          toast.error(payload?.error ?? `Analysis failed (HTTP ${res.status})`, { duration: 8000 });
          return;
        }
      } catch {
        toast.error("Network error during analysis. Check your connection and try again.");
        return;
      }

      const analyzed: AnalyzeResponse = payload.data!;
      if (forPhoneList) {
        setPhoneAnalysis(analyzed);
        setPhoneMappings(buildMappingsFromAnalysis(analyzed));
      } else {
        setAnalysis(analyzed);
        setMappings(buildMappingsFromAnalysis(analyzed));
      }
      toast.success(`Analyzed ${analyzed.totalRows.toLocaleString()} rows from ${file.name}`);
    } finally {
      if (forPhoneList) setAnalyzingPhone(false);
      else setAnalyzing(false);
    }
  }

  async function handleMainFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) {
      toast(`Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — reading in browser, this may take a moment.`, { duration: 5000 });
    }
    setSelectedFile(file);
    await analyzeFile(file, false);
  }

  async function handlePhoneFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoneFile(file);
    await analyzeFile(file, true);
  }

  function isAcceptedImportFile(filename: string) {
    return /\.(csv|tsv|txt|xls|xlsx)$/i.test(filename);
  }

  async function handleMainFileDrop(file: File | null) {
    if (!file) return;
    if (!isAcceptedImportFile(file.name)) {
      toast.error("Unsupported file type. Use .csv, .tsv, .txt, .xls, or .xlsx");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      toast(`Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — reading in browser, this may take a moment.`, { duration: 5000 });
    }
    setSelectedFile(file);
    await analyzeFile(file, false);
  }

  async function handlePhoneFileDrop(file: File | null) {
    if (!file) return;
    if (!isAcceptedImportFile(file.name)) {
      toast.error("Unsupported file type. Use .csv, .tsv, .txt, .xls, or .xlsx");
      return;
    }
    setPhoneFile(file);
    await analyzeFile(file, true);
  }

  function getMappingConfig(map: Record<string, string>) {
    return Object.fromEntries(Object.entries(map).filter(([, target]) => Boolean(target)));
  }

  async function previewDuplicates() {
    if (!selectedFile || !analysis) { toast.error("Upload and analyze a voter list first"); return; }
    setCheckingDuplicates(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("campaignId", campaignId);
      formData.set("mappings", JSON.stringify(getMappingConfig(mappings)));

      const res = await fetch("/api/import/duplicates", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.data) { toast.error(payload?.error ?? "Failed to preview duplicates"); return; }
      setDuplicates(payload.data as DuplicatePreview);
      toast.success("Duplicate preview ready");
    } catch { toast.error("Failed to preview duplicates"); }
    finally { setCheckingDuplicates(false); }
  }

  async function runPhoneMatching() {
    if (!selectedFile || !phoneFile) { toast.error("Upload both voter list and phone list files first"); return; }
    setMatchingPhoneList(true);
    try {
      const thresholds = matchMode === "strict"
        ? { autoMergeThreshold: 92, reviewThreshold: 70 }
        : matchMode === "aggressive"
          ? { autoMergeThreshold: 80, reviewThreshold: 45 }
          : { autoMergeThreshold: 86, reviewThreshold: 55 };

      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("voterFile", selectedFile);
      formData.set("phoneFile", phoneFile);
      formData.set("voterMappings", JSON.stringify(getMappingConfig(mappings)));
      formData.set("phoneMappings", JSON.stringify(getMappingConfig(phoneMappings)));
      formData.set("autoMergeThreshold", String(thresholds.autoMergeThreshold));
      formData.set("reviewThreshold", String(thresholds.reviewThreshold));
      formData.set("useAI", useAiMatch ? "true" : "false");

      const res = await fetch("/api/import/match-files", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.data) { toast.error(payload?.error ?? "Phone matching failed"); return; }
      setPhoneMatch(payload.data as PhoneMatchPreview);
      setPhoneApplyResult(null);
      const sampleRows = (payload.data as PhoneMatchPreview).samples.map((s) => s.rowIndex);
      setSelectedMatchRows(sampleRows);
      toast.success("Phone matching preview generated");
    } catch { toast.error("Phone matching failed"); }
    finally { setMatchingPhoneList(false); }
  }

  async function applyPhoneMatchesBatch() {
    if (!selectedFile || !phoneFile) { toast.error("Upload both files first"); return; }
    setApplyingMatchRows(true);
    try {
      const thresholds = matchMode === "strict"
        ? { autoMergeThreshold: 92, reviewThreshold: 70 }
        : matchMode === "aggressive"
          ? { autoMergeThreshold: 80, reviewThreshold: 45 }
          : { autoMergeThreshold: 86, reviewThreshold: 55 };

      const formData = new FormData();
      formData.set("mode", "apply");
      formData.set("campaignId", campaignId);
      formData.set("voterFile", selectedFile);
      formData.set("phoneFile", phoneFile);
      formData.set("voterMappings", JSON.stringify(getMappingConfig(mappings)));
      formData.set("phoneMappings", JSON.stringify(getMappingConfig(phoneMappings)));
      formData.set("autoMergeThreshold", String(thresholds.autoMergeThreshold));
      formData.set("reviewThreshold", String(thresholds.reviewThreshold));
      formData.set("useAI", useAiMatch ? "true" : "false");
      formData.set("applyStrategy", applyStrategy);
      formData.set("applyScope", applyScope);
      formData.set("applyConfidenceThreshold", String(applyConfidenceThreshold));
      formData.set("selectedRowIndexes", JSON.stringify(selectedMatchRows));
      formData.set("allowCreateFromUnmatched", allowCreateFromUnmatched ? "true" : "false");

      const res = await fetch("/api/import/match-files", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.data) { toast.error(payload?.error ?? "Batch apply failed"); return; }

      const data = payload.data as PhoneMatchPreview & { apply?: PhoneApplyResult };
      setPhoneMatch(data);
      setPhoneApplyResult(data.apply ?? null);
      await loadImportHistory();
      toast.success(`Batch apply complete: ${data.apply?.applied ?? 0} rows applied`);
    } catch { toast.error("Batch apply failed"); }
    finally { setApplyingMatchRows(false); }
  }

  function selectRowsByThreshold() {
    if (!phoneMatch) return;
    setSelectedMatchRows(
      phoneMatch.samples
        .filter((sample) => sample.score >= applyConfidenceThreshold && sample.action !== "new_record")
        .map((sample) => sample.rowIndex)
    );
  }

  async function doQuickImport() {
    if (!parsedFile) { toast.error("No file loaded"); return; }
    if (!mappingHealth.hasNameField) { toast.error("Include at least First Name or Last Name in the column mapping."); return; }

    setImporting(true);
    setImportProgress({ current: 0, total: parsedFile.totalRows });

    const BATCH_SIZE = 500;
    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < parsedFile.allRows.length; i += BATCH_SIZE) {
      batches.push(parsedFile.allRows.slice(i, i + BATCH_SIZE));
    }

    let importLogId: string | undefined;
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    try {
      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        setImportProgress({ current: batchIdx * BATCH_SIZE, total: parsedFile.totalRows });

        let batchRes: Response;
        try {
          batchRes = await fetch("/api/import/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              mappings: getMappingConfig(mappings),
              rows: batches[batchIdx],
              batchMeta: {
                batchIndex: batchIdx,
                totalBatches: batches.length,
                totalRows: parsedFile.totalRows,
                filename: parsedFile.filename,
                importLogId,
              },
            }),
          });
        } catch {
          toast.error(`Network error on batch ${batchIdx + 1}. Import stopped at ${totalImported + totalUpdated} contacts.`);
          break;
        }

        let batchData: {
          data?: { importLogId: string; imported: number; updated: number; skipped: number; errors: string[] };
          error?: string;
        } = {};
        try { batchData = await batchRes.json(); } catch { /* ignore */ }

        if (!batchRes.ok || !batchData?.data) {
          toast.error(batchData?.error ?? `Batch ${batchIdx + 1} failed. Import stopped.`);
          break;
        }

        if (batchIdx === 0) importLogId = batchData.data.importLogId;
        totalImported += batchData.data.imported;
        totalUpdated += batchData.data.updated;
        totalSkipped += batchData.data.skipped;
        if (batchData.data.errors?.length) allErrors.push(...batchData.data.errors);
      }

      setResult({ imported: totalImported, updated: totalUpdated, skipped: totalSkipped, errors: allErrors.slice(0, 20) });
      await loadImportHistory();
      toast.success(`Import complete: ${totalImported.toLocaleString()} new · ${totalUpdated.toLocaleString()} updated · ${totalSkipped.toLocaleString()} skipped`);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }


  function downloadTemplate() {
    const csv = `${CSV_HEADERS.join(",")}\nJane,Smith,jane@email.com,416-555-0100,123 Main St,,Toronto,ON,M4C 1A1,Ward 12,Toronto—Danforth,strong_support,Transit;Housing,yes,no,no,Great contact at the door`;
    const a = document.createElement("a");
    a.href = `data:text/csv,${encodeURIComponent(csv)}`;
    a.download = "poll-city-import-template.csv";
    a.click();
  }

  function SmartSummaryCard({
    analysisData, onImport, importing: isImporting, onShowAdvanced,
  }: {
    analysisData: AnalyzeResponse;
    onImport: () => void;
    importing: boolean;
    onShowAdvanced: () => void;
  }) {
    const stats = analysisData.fieldStats;
    const n = analysisData.totalRows.toLocaleString();
    const previewCols = analysisData.previewRows?.[0] ? Object.keys(analysisData.previewRows[0]) : [];

    const infoChips: string[] = [
      stats && stats.withAddress > 0 ? `${stats.withAddress.toLocaleString()} with address` : "",
      stats && stats.withPollNumber > 0 ? `${stats.withPollNumber.toLocaleString()} with poll #` : "",
      stats && stats.withPhone > 0 ? `${stats.withPhone.toLocaleString()} with phone` : "",
      stats && stats.withEmail > 0 ? `${stats.withEmail.toLocaleString()} with email` : "",
    ].filter(Boolean);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 space-y-5 overflow-hidden"
        style={{ borderColor: `${GREEN}50` }}
      >
        {/* Header band */}
        <div className="px-5 pt-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}20` }}>
              <CheckCircle className="w-5 h-5" style={{ color: GREEN }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: NAVY }}>
                {analysisData.detectedFormatLabel ? `${analysisData.detectedFormatLabel} recognised` : "File ready to import"}
              </p>
              <p className="text-sm text-gray-500">
                {analysisData.detectedFormatDescription ?? "All columns mapped. Review the preview below, then click Import."}
              </p>
            </div>
          </div>

          {/* Count + chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: NAVY }}>
              {n} voters
            </span>
            {infoChips.map((chip) => (
              <span key={chip} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                {chip}
              </span>
            ))}
            {(analysisData.existingContactCount ?? 0) > 0 && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
                {analysisData.existingContactCount!.toLocaleString()} already in campaign (will update)
              </span>
            )}
          </div>
        </div>

        {/* Contextual advisories */}
        {stats && (stats.withPhone === 0 || stats.withPollNumber === 0) && (
          <div className="px-5 space-y-2">
            {stats.withPhone === 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>No phone numbers — normal for electoral lists. Add them later using <strong>Voter-to-Phone Matching</strong> below.</span>
              </div>
            )}
            {stats.withPollNumber === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>No poll numbers detected. GOTV tracking works best with poll numbers. If your file has them under a different column name, use <button onClick={onShowAdvanced} className="underline font-medium">Edit column mapping</button> to assign it.</span>
              </div>
            )}
          </div>
        )}

        {/* Preview rows table */}
        {analysisData.previewRows && analysisData.previewRows.length > 0 && previewCols.length > 0 && (
          <div className="px-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview (first 5 rows)</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {previewCols.map((col) => (
                      <th key={col} className="px-3 py-2 text-left text-gray-600 font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analysisData.previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      {previewCols.map((col) => (
                        <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[col] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parse warnings from file */}
        {analysisData.warnings && analysisData.warnings.length > 0 && (
          <div className="px-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
              {analysisData.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
            </div>
          </div>
        )}

        {/* Import CTA */}
        <div className="px-5 pb-5 flex items-center gap-3 flex-wrap">
          <MButton onClick={onImport} loading={isImporting} size="lg" className="min-w-[220px]">
            <Upload className="w-4 h-4" /> Import {n} voters
          </MButton>
          <button
            onClick={onShowAdvanced}
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
          >
            Something looks wrong? Edit column mapping →
          </button>
        </div>
      </motion.div>
    );
  }

  function MappingTable({
    title, analysisData, map, onMapChange,
  }: {
    title: string;
    analysisData: AnalyzeResponse;
    map: Record<string, string>;
    onMapChange: (next: Record<string, string>) => void;
  }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold" style={{ color: NAVY }}>{title}</p>
        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Source Column</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Target Field</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysisData.rawHeaders.map((header) => (
                <tr key={header} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-800 font-mono text-xs">{header}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={map[header] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const next = { ...map };
                        if (!value) delete next[header];
                        else next[header] = value;
                        onMapChange(next);
                      }}
                      className="text-xs min-h-[44px]"
                    >
                      <option value="">Skip column</option>
                      {groups.map((group) => (
                        <optgroup key={group.category} label={group.category.toUpperCase()}>
                          {group.fields.map((field) => (
                            <option key={field.key} value={field.key}>{field.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function MappingGuide({
    title, analysisData, map, onMapChange,
  }: {
    title: string;
    analysisData: AnalyzeResponse;
    map: Record<string, string>;
    onMapChange: (next: Record<string, string>) => void;
  }) {
    const [showMapped, setShowMapped] = useState(false);

    const columns = analysisData.rawHeaders.map((header) => {
      const suggestion = analysisData.suggestedMappings[header];
      const currentTarget = map[header] ?? null;
      const samples = analysisData.sampleRows
        .slice(0, 5)
        .map((r) => (r[header] ?? "").trim())
        .filter(Boolean)
        .slice(0, 3);
      const confidence = suggestion?.confidence ?? 0;
      const isAutoMapped = confidence >= 80 && !!currentTarget;
      return { header, currentTarget, samples, confidence, isAutoMapped };
    });

    const needsReview = columns.filter((c) => !c.isAutoMapped);
    const autoMapped = columns.filter((c) => c.isAutoMapped);
    const hasNameField = new Set(Object.values(map)).has("firstName") || new Set(Object.values(map)).has("lastName");

    return (
      <div className="space-y-4">
        {/* Guidance header */}
        <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: `${NAVY}20`, backgroundColor: `${NAVY}03` }}>
          <p className="font-semibold text-sm" style={{ color: NAVY }}>{title}</p>
          <p className="text-xs text-gray-500">
            For each column in your file, tell us what it contains so we can store it correctly.
            We auto-detected <strong>{autoMapped.length}</strong> of <strong>{columns.length}</strong> columns.
            {needsReview.length > 0
              ? ` ${needsReview.length} column${needsReview.length > 1 ? "s" : ""} need your review.`
              : " Everything is mapped — review below if needed."}
          </p>
        </div>

        {/* Needs review */}
        {needsReview.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              Needs review ({needsReview.length})
            </p>
            <div className="space-y-2">
              {needsReview.map(({ header, currentTarget, samples }) => (
                <div key={header} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{header}</p>
                      {samples.length > 0 ? (
                        <p className="text-xs text-gray-400 mt-0.5">
                          e.g.{" "}
                          {samples.map((s, i) => (
                            <span key={i}>
                              <span className="font-mono bg-gray-100 px-1 rounded">{s}</span>
                              {i < samples.length - 1 && "  "}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5 italic">no sample values</p>
                      )}
                    </div>
                    <div className="sm:w-56 flex-shrink-0">
                      <Select
                        value={currentTarget ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const next = { ...map };
                          if (!value) delete next[header];
                          else next[header] = value;
                          onMapChange(next);
                        }}
                        className="text-xs min-h-[44px] w-full"
                      >
                        <option value="">— Skip this column —</option>
                        {groups.map((group) => (
                          <optgroup
                            key={group.category}
                            label={
                              group.category === "name" ? "Name fields" :
                              group.category === "address" ? "Address fields" :
                              group.category === "contact" ? "Phone & Email" :
                              group.category === "electoral" ? "Electoral geography" :
                              group.category === "campaign" ? "Campaign data" : "Other"
                            }
                          >
                            {group.fields.map((field) => (
                              <option key={field.key} value={field.key}>{field.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-detected — collapsible */}
        {autoMapped.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMapped((prev) => !prev)}
              className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" style={{ color: GREEN }} />
              Auto-detected ({autoMapped.length}) {showMapped ? "▲ hide" : "▼ show"}
            </button>
            <AnimatePresence>
              {showMapped && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-lg border border-gray-200"
                >
                  {autoMapped.map(({ header, currentTarget, confidence, samples }) => (
                    <div key={header} className="flex items-center px-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-800">{header}</span>
                        {samples.length > 0 && (
                          <span className="text-xs text-gray-400 ml-2">e.g. <span className="font-mono">{samples[0]}</span></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="text-xs font-medium text-gray-900">
                          {TARGET_FIELDS.find((f) => f.key === currentTarget)?.label ?? currentTarget}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${GREEN}15`, color: GREEN }}>
                          {confidence}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...map };
                            delete next[header];
                            onMapChange(next);
                          }}
                          className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                          title="Remove this mapping"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Warning if no name field */}
        {!hasNameField && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Map at least <strong>First Name</strong> or <strong>Last Name</strong> before importing.
              Contacts without names are impossible to find and manage.
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: NAVY }}>Import / Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI column mapping · fuzzy dedupe · voter-to-phone matching · filtered exports</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl p-1 bg-gray-100">
        {(["import", "export"] as const).map(tab => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 min-h-[44px] text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
            style={activeTab === tab ? { color: NAVY } : undefined}
          >
            {tab === "import" ? <ArrowUpFromLine className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
            {tab === "import" ? "Import" : "Export"}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "import" && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Smart Import Wizard — primary CTA */}
            <motion.a
              href="/import-export/smart-import"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={spring}
              className="flex items-center justify-between gap-4 p-5 rounded-2xl border-2 cursor-pointer group"
              style={{ borderColor: GREEN, backgroundColor: `${GREEN}06` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}15` }}>
                  <ArrowUpFromLine className="w-6 h-6" style={{ color: GREEN }} />
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: NAVY }}>Smart Import Wizard</p>
                  <p className="text-sm text-gray-500">Guided 5-step flow — upload, map columns, preview duplicates, choose merge strategy, import. Recommended for all new imports.</p>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white group-hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Start <ArrowUpFromLine className="w-4 h-4" />
              </div>
            </motion.a>

            {/* Manual Import card */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-700">Manual Import</h3>
                    <p className="text-xs text-gray-400 mt-0.5">For experienced users. Drop a file and import immediately.</p>
                  </div>
                  <div className="flex gap-2">
                    <MButton size="sm" variant="ghost" onClick={downloadTemplate}>
                      <FileText className="w-3.5 h-3.5" /> Template
                    </MButton>
                    <MButton size="sm" variant="outline" onClick={previewDuplicates} disabled={!selectedFile || checkingDuplicates}>
                      {checkingDuplicates ? <Shimmer className="w-3.5 h-3.5 rounded-full" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      Duplicates
                    </MButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Drop zone */}
                <motion.label
                  whileHover={{ scale: 1.01 }}
                  transition={spring}
                  className={cn(
                    "flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                    dragMainActive
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragMainActive(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragMainActive(true); }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setDragMainActive(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragMainActive(false);
                    const file = e.dataTransfer.files?.[0] ?? null;
                    await handleMainFileDrop(file);
                  }}
                >
                  {analyzing ? (
                    <div className="py-2 space-y-2 text-center">
                      <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: `${GREEN}15` }}>
                        <Shimmer className="w-6 h-6 rounded-full" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{selectedFile ? `Reading ${selectedFile.name}…` : "Reading file…"}</p>
                      <p className="text-xs text-gray-400">Detecting format · mapping columns · checking for duplicates</p>
                    </div>
                  ) : (
                    <>
                      {selectedFile && analysis ? (
                        <div className="flex items-center gap-3 w-full max-w-sm" onClick={(e) => e.preventDefault()}>
                          <FileSpreadsheet className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate flex-1 text-left">{selectedFile.name}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setAnalysis(null);
                              setParsedFile(null);
                              setResult(null);
                              setSelectedFile(null);
                              setShowAdvancedMapping(false);
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0 underline"
                          >
                            Change file
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GREEN}15` }}>
                            <Upload className="w-6 h-6" style={{ color: GREEN }} />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">Drop your voter list here, or tap to browse</p>
                            <p className="text-xs text-gray-400 mt-1">.csv, .tsv, .txt, .xls, .xlsx · any size</p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handleMainFileSelect} />
                </motion.label>

                {/* Analysis results */}
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Smart auto-detected path */}
                    {(analysis.autoConfidence ?? 0) >= 85 && !showAdvancedMapping ? (
                      <SmartSummaryCard
                        analysisData={analysis}
                        onImport={doQuickImport}
                        importing={importing}
                        onShowAdvanced={() => setShowAdvancedMapping(true)}
                      />
                    ) : (
                      <>
                        {/* File info bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: "File", value: analysis.filename },
                            { label: "Type", value: analysis.fileType.toUpperCase() },
                            { label: "Rows", value: analysis.totalRows.toLocaleString() },
                            { label: "Columns", value: `${analysis.rawHeaders.length} found` },
                          ].map(item => (
                            <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                              <p className="text-gray-500 text-[11px]">{item.label}</p>
                              <p className="font-semibold truncate" style={{ color: NAVY }}>{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {analysis.detectedFormatLabel && (
                          <div className="rounded-lg border p-3 text-xs flex items-center gap-2" style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}08` }}>
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />
                            <span style={{ color: NAVY }}>
                              Detected: <strong>{analysis.detectedFormatLabel}</strong> · {analysis.formatConfidence ?? 0}% confidence
                            </span>
                            {showAdvancedMapping && (analysis.autoConfidence ?? 0) >= 85 && (
                              <button
                                onClick={() => setShowAdvancedMapping(false)}
                                className="ml-auto text-gray-400 hover:text-gray-600 underline underline-offset-2"
                              >
                                ← Back to smart view
                              </button>
                            )}
                          </div>
                        )}

                        <MappingGuide
                          title="Column Mapping"
                          analysisData={analysis}
                          map={mappings}
                          onMapChange={setMappings}
                        />

                        <MButton
                          onClick={doQuickImport}
                          disabled={!parsedFile || !mappingHealth.hasNameField}
                          loading={importing}
                          className="w-full md:w-auto"
                          size="lg"
                        >
                          <Upload className="w-4 h-4" /> Import {analysis.totalRows.toLocaleString()} voters
                        </MButton>
                      </>
                    )}

                    {/* Import progress bar */}
                    <AnimatePresence>
                      {importProgress && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-xl border p-4 space-y-3"
                          style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}06` }}
                        >
                          <div className="flex justify-between text-sm font-medium" style={{ color: NAVY }}>
                            <span>Importing voters...</span>
                            <span>{importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: GREEN }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (importProgress.current / importProgress.total) * 100)}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            {Math.round((importProgress.current / importProgress.total) * 100)}% — do not close this tab
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Duplicate preview */}
                <AnimatePresence>
                  {duplicates && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border p-4 space-y-2"
                      style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}08` }}
                    >
                      <p className="text-sm font-semibold" style={{ color: NAVY }}>Duplicate Intelligence</p>
                      <p className="text-xs" style={{ color: `${NAVY}CC` }}>
                        Checked {duplicates.checkedRows.toLocaleString()} rows, found {duplicates.probableDuplicates.toLocaleString()} probable duplicates,
                        estimated {duplicates.newRecordsEstimate.toLocaleString()} net-new records.
                      </p>
                      {duplicates.duplicateSamples.slice(0, 5).map((sample) => (
                        <p key={`${sample.rowIndex}-${sample.existing.id}`} className="text-xs text-gray-600">
                          Row {sample.rowIndex}: {sample.incoming.firstName} {sample.incoming.lastName} → {sample.existing.firstName} {sample.existing.lastName}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Import result */}
                <AnimatePresence>
                  {result && !importing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border-2 overflow-hidden"
                      style={result.errors.length === 0
                        ? { borderColor: `${GREEN}50` }
                        : { borderColor: `${AMBER}40` }
                      }
                    >
                      {/* Header band */}
                      <div className="p-5 space-y-3" style={{ backgroundColor: result.errors.length === 0 ? `${GREEN}06` : `${AMBER}08` }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: result.errors.length === 0 ? `${GREEN}20` : `${AMBER}20` }}>
                            {result.errors.length === 0
                              ? <CheckCircle className="w-5 h-5" style={{ color: GREEN }} />
                              : <AlertCircle className="w-5 h-5" style={{ color: AMBER }} />
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-base" style={{ color: NAVY }}>
                              {result.errors.length === 0 ? "Import complete!" : "Import completed with warnings"}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong style={{ color: GREEN }}>{result.imported.toLocaleString()}</strong> voters added
                              {result.updated > 0 && <> · <strong>{result.updated.toLocaleString()}</strong> existing records updated</>}
                              {result.skipped > 0 && <> · <strong className="text-amber-600">{result.skipped.toLocaleString()}</strong> rows skipped</>}
                            </p>
                          </div>
                        </div>

                        {/* Skipped explanation */}
                        {result.skipped > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-white/70 p-3 text-xs text-amber-800 space-y-1">
                            <p className="font-medium">Why were {result.skipped.toLocaleString()} rows skipped?</p>
                            <p>Rows are skipped when they&apos;re missing both First Name and Last Name. Check your column mapping or verify the source file has name data.</p>
                            {result.errors.slice(0, 3).map((e, i) => <p key={i} className="text-amber-700 font-mono">• {e}</p>)}
                            {result.errors.length > 3 && <p className="text-amber-500">…and {result.errors.length - 3} more. Check Import History for the full log.</p>}
                          </div>
                        )}
                      </div>

                      {/* Next steps */}
                      <div className="p-5 bg-white border-t border-gray-100 space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">What to do next</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { href: "/contacts", icon: <Users className="w-4 h-4" />, label: "View Contacts", desc: "See all imported voters" },
                            { href: "/gotv", icon: <ClipboardList className="w-4 h-4" />, label: "Set up GOTV", desc: "Plan election day outreach" },
                            { href: "/canvassing", icon: <MapPin className="w-4 h-4" />, label: "Start Canvassing", desc: "Build walk lists" },
                          ].map(({ href, icon, label, desc }) => (
                            <a
                              key={href}
                              href={href}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}10`, color: GREEN }}>
                                {icon}
                              </div>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: NAVY }}>{label}</p>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResult(null);
                            setAnalysis(null);
                            setParsedFile(null);
                            setSelectedFile(null);
                            setShowAdvancedMapping(false);
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                        >
                          Import another file
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Phone matching card */}
            <Card className="overflow-hidden">
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                  <Link2 className="w-4 h-4" /> Voter-to-Phone Matching
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Have a list of phone numbers from another source? Upload it here and we&apos;ll automatically match them to your voters — even if names are spelled slightly differently.
                </p>

                <motion.label
                  whileHover={{ scale: 1.01 }}
                  transition={spring}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                    dragPhoneActive ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragPhoneActive(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragPhoneActive(true); }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setDragPhoneActive(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragPhoneActive(false);
                    const file = e.dataTransfer.files?.[0] ?? null;
                    await handlePhoneFileDrop(file);
                  }}
                >
                  {analyzingPhone ? (
                    <div className="space-y-2 w-full max-w-xs">
                      <Shimmer className="h-3 w-full" />
                      <Shimmer className="h-3 w-2/3" />
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">Drop phone list file here</p>
                    </>
                  )}
                  <input ref={phoneFileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handlePhoneFileSelect} />
                </motion.label>

                {phoneAnalysis && (
                  <MappingTable title="Phone List Mapping" analysisData={phoneAnalysis} map={phoneMappings} onMapChange={setPhoneMappings} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Matching sensitivity</p>
                    <Select value={matchMode} onChange={(e) => setMatchMode(e.target.value as "strict" | "balanced" | "aggressive")} className="min-h-[44px]">
                      <option value="strict">Strict — only obvious matches (safest, fewest false matches)</option>
                      <option value="balanced">Balanced — recommended for most voter lists</option>
                      <option value="aggressive">Aggressive — catch more matches, accept some risk of wrong merges</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">AI assist</p>
                    <Select value={useAiMatch ? "ai-on" : "ai-off"} onChange={(e) => setUseAiMatch(e.target.value === "ai-on")} className="min-h-[44px]">
                      <option value="ai-on">On — AI resolves ambiguous name matches (e.g. &quot;Bob&quot; vs &quot;Robert&quot;)</option>
                      <option value="ai-off">Off — rule-based matching only (faster, no AI cost)</option>
                    </Select>
                  </div>
                </div>

                <MButton onClick={runPhoneMatching} loading={matchingPhoneList} disabled={!selectedFile || !phoneFile || !analysis || !phoneAnalysis}>
                  <Link2 className="w-4 h-4" /> Run Voter-to-Phone Matching
                </MButton>

                {phoneMatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border p-4 space-y-3"
                    style={{ borderColor: `${GREEN}40`, backgroundColor: `${GREEN}08` }}
                  >
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>Phone Match Summary</p>
                    <p className="text-xs" style={{ color: `${NAVY}CC` }}>
                      Total: {phoneMatch.summary.totalMatches ?? 0} · Auto-merge: {phoneMatch.summary.autoMerged} · Review: {phoneMatch.summary.needsReview} · Unmatched: {phoneMatch.summary.unmatched} · Eligible @ threshold: {phoneMatch.summary.eligibleAtThreshold ?? 0}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <label className="text-xs" style={{ color: NAVY }}>
                        Auto-apply threshold
                        <input
                          type="number"
                          min={0} max={100}
                          value={applyConfidenceThreshold}
                          onChange={(e) => setApplyConfidenceThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-800 min-h-[44px]"
                        />
                      </label>
                      <label className="text-xs" style={{ color: NAVY }}>
                        Apply strategy
                        <Select value={applyStrategy} onChange={(e) => setApplyStrategy(e.target.value as "threshold" | "selected" | "selected_or_threshold")} className="min-h-[44px]">
                          <option value="selected_or_threshold">Selected OR threshold</option>
                          <option value="threshold">Threshold only</option>
                          <option value="selected">Selected rows only</option>
                        </Select>
                      </label>
                      <label className="text-xs" style={{ color: NAVY }}>
                        Apply scope
                        <Select value={applyScope} onChange={(e) => setApplyScope(e.target.value as "preview_sample" | "all_matches")} className="min-h-[44px]">
                          <option value="preview_sample">Preview sample only</option>
                          <option value="all_matches">All matched rows</option>
                        </Select>
                      </label>
                      <MButton onClick={applyPhoneMatchesBatch} loading={applyingMatchRows}>
                        <Link2 className="w-4 h-4" /> Apply Batch
                      </MButton>
                    </div>
                    <label className="flex items-center gap-2 text-xs min-h-[44px]" style={{ color: NAVY }}>
                      <input type="checkbox" checked={allowCreateFromUnmatched} onChange={(e) => setAllowCreateFromUnmatched(e.target.checked)} className="w-4 h-4" />
                      Allow create from unmatched rows
                    </label>
                    {applyScope === "all_matches" && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        You are applying to all matched rows, not just preview samples.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <MButton size="sm" variant="outline" onClick={() => setSelectedMatchRows(phoneMatch.samples.map((s) => s.rowIndex))}>Select all</MButton>
                      <MButton size="sm" variant="outline" onClick={() => setSelectedMatchRows([])}>Clear</MButton>
                      <MButton size="sm" variant="outline" onClick={selectRowsByThreshold}>By threshold</MButton>
                      <span className="text-xs self-center" style={{ color: GREEN }}>Selected: {selectedMatchRows.length}</span>
                    </div>
                    {phoneMatch.samples.slice(0, 6).map((sample) => (
                      <label key={`${sample.rowIndex}-${sample.score}`} className="flex items-start gap-2 text-xs min-h-[44px] py-1" style={{ color: `${NAVY}CC` }}>
                        <input
                          type="checkbox"
                          checked={selectedMatchRows.includes(sample.rowIndex)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedMatchRows((prev) => Array.from(new Set([...prev, sample.rowIndex])));
                            else setSelectedMatchRows((prev) => prev.filter((r) => r !== sample.rowIndex));
                          }}
                          className="mt-0.5 w-4 h-4"
                        />
                        <span>
                          Row {sample.rowIndex} ({sample.action}, {sample.score}%): {sample.voter.firstName} {sample.voter.lastName} → {sample.phoneRecord.firstName} {sample.phoneRecord.lastName}
                        </span>
                      </label>
                    ))}
                    {phoneApplyResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
                      >
                        Applied: {phoneApplyResult.applied} (created {phoneApplyResult.created}, updated {phoneApplyResult.updated}, skipped {phoneApplyResult.skipped})
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Import history */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                  <History className="w-4 h-4" /> Import History
                </h3>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <EmptyState
                    icon={<FileSpreadsheet className="w-10 h-10" />}
                    title="No imports yet"
                    description="Upload a voter list above to get started."
                    action={
                      <MButton size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Upload File
                      </MButton>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">File</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Status</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Imported</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Updated</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Skipped</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">When</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Rollback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.slice(0, 10).map((item) => {
                          const canRollback =
                            item.status !== "rolled_back" &&
                            item.rollbackDeadline != null &&
                            new Date(item.rollbackDeadline) > new Date();
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 text-gray-800">{item.filename}</td>
                              <td className="px-3 py-2">
                                <Badge variant={item.status === "completed" ? "success" : item.status === "failed" ? "danger" : item.status === "rolled_back" ? "warning" : "default"}>
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{item.importedCount ?? 0}</td>
                              <td className="px-3 py-2 text-gray-700">{item.updatedCount ?? 0}</td>
                              <td className="px-3 py-2 text-gray-700">{item.skippedCount ?? 0}</td>
                              <td className="px-3 py-2 text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                              <td className="px-3 py-2">
                                {canRollback ? (
                                  <div className="flex flex-col gap-1">
                                    <ImportCountdown deadline={item.rollbackDeadline!} />
                                    <button
                                      onClick={() => handleRollback(item.id, item.filename)}
                                      disabled={rollingBack.has(item.id)}
                                      className="flex items-center gap-1 text-amber-700 hover:text-amber-900 disabled:opacity-50 font-medium text-xs"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      {rollingBack.has(item.id) ? "Rolling back…" : "Undo import"}
                                    </button>
                                  </div>
                                ) : item.status === "rolled_back" ? (
                                  <span className="text-xs text-gray-400 italic">Undone</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "export" && (
          <motion.div
            key="export"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ExportPanel campaignId={campaignId} />
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
