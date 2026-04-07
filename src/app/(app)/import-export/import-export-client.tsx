"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Upload, Download, FileText, AlertCircle, CheckCircle, History,
  Link2, FileSpreadsheet, Users, MapPin, Heart, HandHelping,
  MessageSquare, ClipboardList, Package, ArrowUpFromLine, ArrowDownToLine,
} from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Select, Badge, EmptyState } from "@/components/ui";
import { TARGET_FIELDS } from "@/lib/import/column-mapper";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Constants ──────────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

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

interface AnalyzeResponse {
  filename: string;
  fileType: string;
  totalRows: number;
  skippedRows: number;
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  suggestedMappings: Record<string, MappingCandidate>;
  warnings: string[];
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

interface ImportHistoryItem {
  id: string;
  filename: string;
  status: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  createdAt: string;
}

interface ExportHistoryItem {
  type: string;
  filename: string;
  rows: number;
  downloadedAt: string;
}

const CSV_HEADERS = [
  "firstName", "lastName", "email", "phone", "address1", "address2",
  "city", "province", "postalCode", "ward", "riding", "supportLevel",
  "issues", "signRequested", "volunteerInterest", "doNotContact", "notes",
];

const EXPORT_TYPES: Array<{ endpoint: string; label: string; description: string; icon: React.ReactNode }> = [
  { endpoint: "/api/export/contacts", label: "All Contacts", description: "Every contact with full details and tags", icon: <Users className="w-5 h-5" /> },
  { endpoint: "/api/export/gotv", label: "GOTV Priority List", description: "Supporters for election day outreach", icon: <ClipboardList className="w-5 h-5" /> },
  { endpoint: "/api/export/walklist", label: "Walk List", description: "Canvassing order by street and house number", icon: <MapPin className="w-5 h-5" /> },
  { endpoint: "/api/export/signs", label: "Signs", description: "All sign requests and installs", icon: <Package className="w-5 h-5" /> },
  { endpoint: "/api/export/donations", label: "Donations", description: "Ontario-compliant donor report", icon: <Heart className="w-5 h-5" /> },
  { endpoint: "/api/export/volunteers", label: "Volunteers", description: "Volunteers with skills and availability", icon: <HandHelping className="w-5 h-5" /> },
  { endpoint: "/api/export/interactions", label: "Interaction Log", description: "Every door knock, call, email, note", icon: <MessageSquare className="w-5 h-5" /> },
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
  const [bulkExporting, setBulkExporting] = useState(false);
  const [dragMainActive, setDragMainActive] = useState(false);
  const [dragPhoneActive, setDragPhoneActive] = useState(false);

  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePreview | null>(null);
  const [phoneMatch, setPhoneMatch] = useState<PhoneMatchPreview | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [exportingByEndpoint, setExportingByEndpoint] = useState<Record<string, boolean>>({});
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

  // Load export history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`poll-city-export-history-${campaignId}`);
      if (stored) setExportHistory(JSON.parse(stored));
    } catch { /* non-blocking */ }
  }, [campaignId]);

  function saveExportHistoryItem(item: ExportHistoryItem) {
    setExportHistory(prev => {
      const next = [item, ...prev].slice(0, 50);
      try { localStorage.setItem(`poll-city-export-history-${campaignId}`, JSON.stringify(next)); } catch { /* ok */ }
      return next;
    });
  }

  async function loadImportHistory() {
    try {
      const res = await fetch(`/api/import/history?campaignId=${campaignId}`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(Array.isArray(data?.data) ? data.data : []);
    } catch { /* Non-blocking */ }
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

  async function analyzeFile(file: File, forPhoneList = false) {
    if (forPhoneList) setAnalyzingPhone(true);
    else { setAnalyzing(true); setResult(null); setDuplicates(null); }

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("campaignId", campaignId);

      const res = await fetch("/api/import/analyze", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.data) {
        toast.error(payload?.error ?? "Unable to analyze this file");
        return;
      }

      const analyzed: AnalyzeResponse = payload.data;
      if (forPhoneList) {
        setPhoneAnalysis(analyzed);
        setPhoneMappings(buildMappingsFromAnalysis(analyzed));
      } else {
        setAnalysis(analyzed);
        setMappings(buildMappingsFromAnalysis(analyzed));
      }
      toast.success(`Analyzed ${analyzed.totalRows} rows from ${file.name}`);
    } catch {
      toast.error("Unable to analyze file. Please try again.");
    } finally {
      if (forPhoneList) setAnalyzingPhone(false);
      else setAnalyzing(false);
    }
  }

  async function handleMainFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!selectedFile) { toast.error("Choose a file first"); return; }
    if (!mappingHealth.hasNameField) { toast.error("Missing name mapping. Include at least First Name or Last Name."); return; }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("campaignId", campaignId);
      formData.set("mappings", JSON.stringify(getMappingConfig(mappings)));

      const res = await fetch("/api/import/execute", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.data) { toast.error(data?.error ?? "Import failed"); return; }

      const importResult: ImportResult = {
        imported: data.data.imported ?? 0,
        updated: data.data.updated ?? 0,
        skipped: data.data.skipped ?? 0,
        errors: Array.isArray(data.data.errors) ? data.data.errors : [],
      };
      setResult(importResult);
      await loadImportHistory();
      toast.success(`Import complete: ${importResult.imported} new, ${importResult.updated} updated`);
    } catch { toast.error("Network error during import"); }
    finally { setImporting(false); }
  }

  async function doExport(endpoint: string, label: string) {
    setExportingByEndpoint((prev) => ({ ...prev, [endpoint]: true }));
    try {
      const res = await fetch(`${endpoint}?campaignId=${campaignId}`);
      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}));
        throw new Error(errorPayload?.error ?? "Export failed");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename=\"([^\"]+)\"/);
      const filename = filenameMatch?.[1] ?? `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${label} downloaded`);

      // Save to export history
      saveExportHistoryItem({
        type: label,
        filename,
        rows: 0, // We don't know row count from blob
        downloadedAt: new Date().toISOString(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to export ${label}`);
    } finally {
      setExportingByEndpoint((prev) => ({ ...prev, [endpoint]: false }));
    }
  }

  async function exportOpsPack() {
    setBulkExporting(true);
    try {
      for (const ex of EXPORT_TYPES) {
        await doExport(ex.endpoint, ex.label);
      }
      toast.success("Operations export pack complete");
    } finally { setBulkExporting(false); }
  }

  function downloadTemplate() {
    const csv = `${CSV_HEADERS.join(",")}\nJane,Smith,jane@email.com,416-555-0100,123 Main St,,Toronto,ON,M4C 1A1,Ward 12,Toronto—Danforth,strong_support,Transit;Housing,yes,no,no,Great contact at the door`;
    const a = document.createElement("a");
    a.href = `data:text/csv,${encodeURIComponent(csv)}`;
    a.download = "poll-city-import-template.csv";
    a.click();
  }

  const anyExporting = Object.values(exportingByEndpoint).some(Boolean) || bulkExporting;

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

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Import / Export</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI mapping, fuzzy dedupe, phone matching, and one-click exports</p>
        </div>
        <div className="flex gap-2">
          <MButton variant="outline" size="sm" onClick={() => window.location.href = "/import-export/smart-import"}>
            <ArrowUpFromLine className="w-4 h-4" /> Smart Import Wizard
          </MButton>
        </div>
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
            {/* Import card */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b-2 border-[#1D9E75]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: NAVY }}>Quick Import</h3>
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
                    <div className="space-y-2 w-full max-w-xs">
                      <Shimmer className="h-3 w-full" />
                      <Shimmer className="h-3 w-3/4" />
                      <Shimmer className="h-3 w-1/2" />
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GREEN}15` }}>
                        <Upload className="w-6 h-6" style={{ color: GREEN }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Drop your voter list here, or tap to browse</p>
                        <p className="text-xs text-gray-400 mt-1">.csv, .tsv, .txt, .xls, .xlsx</p>
                      </div>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {[
                        { label: "File", value: analysis.filename },
                        { label: "Type", value: analysis.fileType.toUpperCase() },
                        { label: "Rows", value: analysis.totalRows.toLocaleString() },
                        { label: "Mapped", value: `${mappingHealth.mapped}/${mappingHealth.total}` },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                          <p className="text-gray-500 text-[11px]">{item.label}</p>
                          <p className="font-semibold truncate" style={{ color: NAVY }}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <MappingTable title="Column Mapping" analysisData={analysis} map={mappings} onMapChange={setMappings} />

                    {!mappingHealth.hasNameField && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Include at least First Name or Last Name mapping before import.
                      </div>
                    )}

                    <MButton onClick={doQuickImport} disabled={!selectedFile || !mappingHealth.hasNameField} loading={importing} className="w-full md:w-auto">
                      <Upload className="w-4 h-4" /> Run Import
                    </MButton>
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
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("p-4 rounded-lg border", result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {result.errors.length === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                        <p className="text-sm font-medium">{result.imported} imported · {result.updated} updated · {result.skipped} skipped</p>
                      </div>
                      {result.errors.length > 0 && (
                        <div className="space-y-1">
                          {result.errors.slice(0, 10).map((e) => <p key={e} className="text-xs text-amber-700">{e}</p>)}
                        </div>
                      )}
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
                <p className="text-sm text-gray-600">Upload a second file (phone list) and run fuzzy matching with optional AI support.</p>

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
                  <Select value={matchMode} onChange={(e) => setMatchMode(e.target.value as "strict" | "balanced" | "aggressive")} className="min-h-[44px]">
                    <option value="strict">Strict matching (lowest false positives)</option>
                    <option value="balanced">Balanced matching (recommended)</option>
                    <option value="aggressive">Aggressive matching (highest merge rate)</option>
                  </Select>
                  <Select value={useAiMatch ? "ai-on" : "ai-off"} onChange={(e) => setUseAiMatch(e.target.value === "ai-on")} className="min-h-[44px]">
                    <option value="ai-on">AI assist for ambiguous matches: On</option>
                    <option value="ai-off">AI assist for ambiguous matches: Off</option>
                  </Select>
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.slice(0, 10).map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-gray-800">{item.filename}</td>
                            <td className="px-3 py-2">
                              <Badge variant={item.status === "completed" ? "success" : item.status === "failed" ? "danger" : "default"}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{item.importedCount ?? 0}</td>
                            <td className="px-3 py-2 text-gray-700">{item.updatedCount ?? 0}</td>
                            <td className="px-3 py-2 text-gray-700">{item.skippedCount ?? 0}</td>
                            <td className="px-3 py-2 text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
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
            className="space-y-5"
          >
            {/* Exports card */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b-2 border-[#1D9E75]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold" style={{ color: NAVY }}>Targeted Exports</h3>
                  <MButton onClick={exportOpsPack} loading={bulkExporting} variant="outline" size="sm">
                    <Download className="w-4 h-4" /> Export All (Ops Pack)
                  </MButton>
                </div>
                <p className="text-sm text-gray-500 mt-1">Purpose-built CSV exports for GOTV, canvassing, volunteers, donations, and compliance.</p>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Background processing indicator */}
                <AnimatePresence>
                  {anyExporting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-lg p-3 flex items-center gap-3"
                      style={{ backgroundColor: `${GREEN}10`, border: `1px solid ${GREEN}30` }}
                    >
                      <div className="relative w-5 h-5">
                        <Shimmer className="w-5 h-5 rounded-full" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: GREEN }}>Preparing export...</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXPORT_TYPES.map((ex) => (
                    <motion.button
                      key={ex.endpoint}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      onClick={() => doExport(ex.endpoint, ex.label)}
                      disabled={exportingByEndpoint[ex.endpoint]}
                      className="flex items-start gap-3 text-left p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors min-h-[44px] disabled:opacity-60"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}10`, color: GREEN }}>
                        {exportingByEndpoint[ex.endpoint]
                          ? <Shimmer className="w-5 h-5 rounded" />
                          : ex.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{ex.label}</p>
                        <p className="text-xs text-gray-500">{ex.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export history */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                  <History className="w-4 h-4" /> Export History
                </h3>
              </CardHeader>
              <CardContent>
                {exportHistory.length === 0 ? (
                  <EmptyState
                    icon={<Download className="w-10 h-10" />}
                    title="No exports yet"
                    description="Download any export above to see it tracked here."
                  />
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Type</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Filename</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {exportHistory.slice(0, 20).map((item, i) => (
                          <tr key={`${item.downloadedAt}-${i}`} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2">
                              <Badge variant="info">{item.type}</Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-800 truncate max-w-[200px]">{item.filename}</td>
                            <td className="px-3 py-2 text-gray-500">{new Date(item.downloadedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
