"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2, History, Link2 } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Select } from "@/components/ui";
import { TARGET_FIELDS } from "@/lib/import/column-mapper";
import { toast } from "sonner";

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
    voterRows: number;
    phoneRows: number;
    autoMerged: number;
    needsReview: number;
    unmatched: number;
    highConfidence: number;
    mediumConfidence: number;
  };
  samples: Array<{
    rowIndex: number;
    action: string;
    confidence: string;
    score: number;
    matchedOn: string[];
    voter: { firstName?: string; lastName?: string; phone?: string; email?: string };
    phoneRecord: { firstName?: string; lastName?: string; phone?: string; email?: string };
  }>;
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

const CSV_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address1",
  "address2",
  "city",
  "province",
  "postalCode",
  "ward",
  "riding",
  "supportLevel",
  "issues",
  "signRequested",
  "volunteerInterest",
  "doNotContact",
  "notes",
];

const EXPORT_TYPES: Array<{ endpoint: string; label: string; description: string }> = [
  { endpoint: "/api/export/contacts", label: "All Contacts", description: "Every contact with full details and tags" },
  { endpoint: "/api/export/gotv", label: "GOTV Priority List", description: "Supporters for election day outreach" },
  { endpoint: "/api/export/walklist", label: "Walk List", description: "Canvassing order by street and house number" },
  { endpoint: "/api/export/signs", label: "Signs", description: "All sign requests and installs" },
  { endpoint: "/api/export/donations", label: "Donations", description: "Ontario-compliant donor report" },
  { endpoint: "/api/export/volunteers", label: "Volunteers", description: "Volunteers with skills and availability" },
  { endpoint: "/api/export/interactions", label: "Interaction Log", description: "Every door knock, call, email, note" },
];

const categoryOrder = ["name", "address", "contact", "electoral", "campaign", "other"] as const;

function groupedFields() {
  return categoryOrder.map((category) => ({
    category,
    fields: TARGET_FIELDS.filter((field) => field.category === category),
  }));
}

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

  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePreview | null>(null);
  const [phoneMatch, setPhoneMatch] = useState<PhoneMatchPreview | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [exportingByEndpoint, setExportingByEndpoint] = useState<Record<string, boolean>>({});
  const [useAiMatch, setUseAiMatch] = useState(true);
  const [matchMode, setMatchMode] = useState<"strict" | "balanced" | "aggressive">("balanced");

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
    } catch {
      // Non-blocking
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

  async function analyzeFile(file: File, forPhoneList = false) {
    if (forPhoneList) {
      setAnalyzingPhone(true);
    } else {
      setAnalyzing(true);
      setResult(null);
      setDuplicates(null);
    }

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
      if (forPhoneList) {
        setAnalyzingPhone(false);
      } else {
        setAnalyzing(false);
      }
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

  function getMappingConfig(map: Record<string, string>) {
    return Object.fromEntries(Object.entries(map).filter(([, target]) => Boolean(target)));
  }

  async function previewDuplicates() {
    if (!selectedFile || !analysis) {
      toast.error("Upload and analyze a voter list first");
      return;
    }

    setCheckingDuplicates(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("campaignId", campaignId);
      formData.set("mappings", JSON.stringify(getMappingConfig(mappings)));

      const res = await fetch("/api/import/duplicates", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok || !payload?.data) {
        toast.error(payload?.error ?? "Failed to preview duplicates");
        return;
      }

      setDuplicates(payload.data as DuplicatePreview);
      toast.success("Duplicate preview ready");
    } catch {
      toast.error("Failed to preview duplicates");
    } finally {
      setCheckingDuplicates(false);
    }
  }

  async function runPhoneMatching() {
    if (!selectedFile || !phoneFile) {
      toast.error("Upload both voter list and phone list files first");
      return;
    }

    setMatchingPhoneList(true);
    try {
      const thresholds =
        matchMode === "strict"
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
      if (!res.ok || !payload?.data) {
        toast.error(payload?.error ?? "Phone matching failed");
        return;
      }

      setPhoneMatch(payload.data as PhoneMatchPreview);
      toast.success("Phone matching preview generated");
    } catch {
      toast.error("Phone matching failed");
    } finally {
      setMatchingPhoneList(false);
    }
  }

  async function doQuickImport() {
    if (!selectedFile) {
      toast.error("Choose a file first");
      return;
    }
    if (!mappingHealth.hasNameField) {
      toast.error("Missing name mapping. Include at least First Name or Last Name.");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("campaignId", campaignId);
      formData.set("mappings", JSON.stringify(getMappingConfig(mappings)));

      const res = await fetch("/api/import/execute", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data?.data) {
        toast.error(data?.error ?? "Import failed");
        return;
      }

      const importResult: ImportResult = {
        imported: data.data.imported ?? 0,
        updated: data.data.updated ?? 0,
        skipped: data.data.skipped ?? 0,
        errors: Array.isArray(data.data.errors) ? data.data.errors : [],
      };

      setResult(importResult);
      await loadImportHistory();
      toast.success(`Import complete: ${importResult.imported} new, ${importResult.updated} updated`);
    } catch {
      toast.error("Network error during import");
    } finally {
      setImporting(false);
    }
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
    } finally {
      setBulkExporting(false);
    }
  }

  function downloadTemplate() {
    const csv = `${CSV_HEADERS.join(",")}\nJane,Smith,jane@email.com,416-555-0100,123 Main St,,Toronto,ON,M4C 1A1,Ward 12,Toronto—Danforth,strong_support,Transit;Housing,yes,no,no,Great contact at the door`;
    const a = document.createElement("a");
    a.href = `data:text/csv,${encodeURIComponent(csv)}`;
    a.download = "poll-city-import-template.csv";
    a.click();
  }

  function MappingTable({
    title,
    analysisData,
    map,
    onMapChange,
  }: {
    title: string;
    analysisData: AnalyzeResponse;
    map: Record<string, string>;
    onMapChange: (next: Record<string, string>) => void;
  }) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Source Column</th>
                <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Target Field</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysisData.rawHeaders.map((header) => (
                <tr key={header}>
                  <td className="px-2 py-1.5 text-gray-800">{header}</td>
                  <td className="px-2 py-1.5">
                    <Select
                      value={map[header] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const next = { ...map };
                        if (!value) delete next[header];
                        else next[header] = value;
                        onMapChange(next);
                      }}
                      className="text-xs"
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

  return (
    <div className="max-w-5xl space-y-5 animate-fade-in">
      <PageHeader title="Import / Export" description="Enterprise list ops: AI mapping, fuzzy dedupe, phone matching, and one-click exports" />

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Enterprise List Import</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <FileText className="w-3.5 h-3.5" />Download Template
            </Button>
            <Button size="sm" variant="outline" onClick={previewDuplicates} disabled={!selectedFile || checkingDuplicates}>
              {checkingDuplicates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}Preview Duplicates
            </Button>
          </div>

          <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            {analyzing ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <Upload className="w-8 h-8 text-gray-400" />}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Choose voter list file</p>
              <p className="text-xs text-gray-400 mt-0.5">Supports .csv, .tsv, .txt, .xls, .xlsx</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handleMainFileSelect} />
          </label>

          {analysis && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">File</p><p className="font-semibold truncate">{analysis.filename}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Type</p><p className="font-semibold uppercase">{analysis.fileType}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Rows</p><p className="font-semibold">{analysis.totalRows.toLocaleString()}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Mapped</p><p className="font-semibold">{mappingHealth.mapped}/{mappingHealth.total}</p></div>
              </div>

              <MappingTable
                title="Column Mapping"
                analysisData={analysis}
                map={mappings}
                onMapChange={setMappings}
              />

              {!mappingHealth.hasNameField && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  Include at least First Name or Last Name mapping before import.
                </div>
              )}

              <Button onClick={doQuickImport} loading={importing} disabled={!selectedFile || !mappingHealth.hasNameField} className="w-full md:w-auto">
                <Upload className="w-4 h-4" />Run Import
              </Button>
            </>
          )}

          {duplicates && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">Duplicate Intelligence</p>
              <p className="text-xs text-blue-800">
                Checked {duplicates.checkedRows.toLocaleString()} rows, found {duplicates.probableDuplicates.toLocaleString()} probable duplicates,
                estimated {duplicates.newRecordsEstimate.toLocaleString()} net-new records.
              </p>
              {duplicates.duplicateSamples.slice(0, 5).map((sample) => (
                <p key={`${sample.rowIndex}-${sample.existing.id}`} className="text-xs text-blue-800">
                  Row {sample.rowIndex}: {sample.incoming.firstName} {sample.incoming.lastName} {"->"} {sample.existing.firstName} {sample.existing.lastName}
                </p>
              ))}
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.errors.length === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                <p className="text-sm font-medium">{result.imported} imported · {result.updated} updated · {result.skipped} skipped</p>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  {result.errors.slice(0, 10).map((e) => <p key={e} className="text-xs text-amber-700">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Link2 className="w-4 h-4" />Voter List to Phone List Matching</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Upload a second file (phone list) and run fuzzy matching with optional AI support for grey-zone records.</p>

          <label className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            {analyzingPhone ? <Loader2 className="w-7 h-7 text-blue-500 animate-spin" /> : <Upload className="w-7 h-7 text-gray-400" />}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Choose phone list file</p>
            </div>
            <input ref={phoneFileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handlePhoneFileSelect} />
          </label>

          {phoneAnalysis && (
            <MappingTable
              title="Phone List Mapping"
              analysisData={phoneAnalysis}
              map={phoneMappings}
              onMapChange={setPhoneMappings}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Select value={matchMode} onChange={(e) => setMatchMode(e.target.value as "strict" | "balanced" | "aggressive") }>
              <option value="strict">Strict matching (lowest false positives)</option>
              <option value="balanced">Balanced matching (recommended)</option>
              <option value="aggressive">Aggressive matching (highest merge rate)</option>
            </Select>
            <Select value={useAiMatch ? "ai-on" : "ai-off"} onChange={(e) => setUseAiMatch(e.target.value === "ai-on")}>
              <option value="ai-on">AI assist for ambiguous matches: On</option>
              <option value="ai-off">AI assist for ambiguous matches: Off</option>
            </Select>
          </div>

          <Button onClick={runPhoneMatching} loading={matchingPhoneList} disabled={!selectedFile || !phoneFile || !analysis || !phoneAnalysis}>
            <Link2 className="w-4 h-4" />Run Voter-to-Phone Matching
          </Button>

          {phoneMatch && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-blue-900">Phone Match Summary</p>
              <p className="text-xs text-blue-800">
                Auto-merge: {phoneMatch.summary.autoMerged} · Review: {phoneMatch.summary.needsReview} · Unmatched: {phoneMatch.summary.unmatched}
              </p>
              {phoneMatch.samples.slice(0, 6).map((sample) => (
                <p key={`${sample.rowIndex}-${sample.score}`} className="text-xs text-blue-800">
                  Row {sample.rowIndex} ({sample.action}, {sample.score}%): {sample.voter.firstName} {sample.voter.lastName} {"->"} {sample.phoneRecord.firstName} {sample.phoneRecord.lastName}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Specialized Exports</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">Purpose-built CSV exports for GOTV, canvassing, volunteers, donations, and compliance reporting.</p>
          <div className="mb-3">
            <Button onClick={exportOpsPack} loading={bulkExporting} variant="outline">
              <Download className="w-4 h-4" />Export Campaign Operations Pack
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPORT_TYPES.map((ex) => (
              <button
                key={ex.endpoint}
                onClick={() => doExport(ex.endpoint, ex.label)}
                className="flex items-start gap-2 text-left p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
              >
                {exportingByEndpoint[ex.endpoint]
                  ? <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
                  : <Download className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{ex.label}</p>
                  <p className="text-xs text-gray-500 truncate">{ex.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" />Recent Imports</h3>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No imports yet for this campaign.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">File</th>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Status</th>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Imported</th>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Updated</th>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Skipped</th>
                    <th className="px-2 py-1.5 text-left text-gray-600 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5 text-gray-800">{item.filename}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.status}</td>
                      <td className="px-2 py-1.5 text-gray-700">{item.importedCount ?? 0}</td>
                      <td className="px-2 py-1.5 text-gray-700">{item.updatedCount ?? 0}</td>
                      <td className="px-2 py-1.5 text-gray-700">{item.skippedCount ?? 0}</td>
                      <td className="px-2 py-1.5 text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
