"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2, History } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader } from "@/components/ui";
import { toast } from "sonner";

interface Props { campaignId: string; }

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ColumnMapping {
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
  suggestedMappings: Record<string, ColumnMapping>;
  warnings: string[];
}

interface ImportHistoryItem {
  id: string;
  filename: string;
  fileType: string;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: string;
  createdAt: string;
}

const CSV_HEADERS = ["firstName", "lastName", "email", "phone", "address1", "address2", "city", "province", "postalCode", "ward", "riding", "supportLevel", "issues", "signRequested", "volunteerInterest", "doNotContact", "notes"];
const SUPPORT_LEVEL_VALUES = ["strong_support", "leaning_support", "undecided", "leaning_opposition", "strong_opposition", "unknown"];

export default function ImportExportClient({ campaignId }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportingByEndpoint, setExportingByEndpoint] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const importReady = Boolean(selectedFile && analysis && Object.keys(mappings).length > 0);

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

  async function analyzeFile(file: File) {
    setAnalyzing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("campaignId", campaignId);

      const res = await fetch("/api/import/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok || !payload?.data) {
        toast.error(payload?.error ?? "Unable to analyze this file");
        return;
      }

      const analyzed: AnalyzeResponse = payload.data;
      setAnalysis(analyzed);
      setMappings(buildMappingsFromAnalysis(analyzed));
      toast.success(`Analyzed ${analyzed.totalRows} rows from ${file.name}`);
    } catch {
      toast.error("Unable to analyze file. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    await analyzeFile(file);
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
      formData.set("mappings", JSON.stringify(mappings));

      const res = await fetch("/api/import/execute", {
        method: "POST",
        body: formData,
      });
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
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
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
    const csv = CSV_HEADERS.join(",") + "\nJane,Smith,jane@email.com,416-555-0100,123 Main St,,Toronto,ON,M4C 1A1,Ward 12,Toronto—Danforth,strong_support,Transit;Housing,yes,no,no,Great contact at the door";
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "poll-city-import-template.csv"; a.click();
  }

  const EXPORT_TYPES: Array<{ endpoint: string; label: string; description: string }> = [
    { endpoint: "/api/export/contacts", label: "All Contacts", description: "Every contact with full details and tags" },
    { endpoint: "/api/export/gotv", label: "GOTV Priority List", description: "Supporters for election day outreach" },
    { endpoint: "/api/export/walklist", label: "Walk List", description: "Canvassing order by street and house number" },
    { endpoint: "/api/export/signs", label: "Signs", description: "All sign requests and installs" },
    { endpoint: "/api/export/donations", label: "Donations", description: "Ontario-compliant donor report" },
    { endpoint: "/api/export/volunteers", label: "Volunteers", description: "Volunteers with skills and availability" },
    { endpoint: "/api/export/interactions", label: "Interaction Log", description: "Every door knock, call, email, note" },
  ];

  return (
    <div className="max-w-5xl space-y-5 animate-fade-in">
      <PageHeader title="Import / Export" description="Simple enterprise list operations: upload, auto-map, import, export" />

      {/* Quick import */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Quick Import (CSV, TSV, XLSX)</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Upload one list file and Poll City auto-detects columns, maps fields, and imports with duplicate update protection.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <FileText className="w-3.5 h-3.5" />Download Template
            </Button>
          </div>

          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
            {analyzing ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <Upload className="w-8 h-8 text-gray-400" />}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Choose list file</p>
              <p className="text-xs text-gray-400 mt-0.5">Supports .csv, .tsv, .txt, .xls, .xlsx</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />
          </label>

          {analysis && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">File</p><p className="font-semibold truncate">{analysis.filename}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Type</p><p className="font-semibold uppercase">{analysis.fileType}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Rows</p><p className="font-semibold">{analysis.totalRows.toLocaleString()}</p></div>
                <div className="rounded-md bg-gray-50 p-2"><p className="text-gray-500">Mapped</p><p className="font-semibold">{mappingHealth.mapped}/{mappingHealth.total}</p></div>
              </div>

              {!mappingHealth.hasNameField && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  This file does not map to a name field yet. Include first/last name columns in your list.
                </div>
              )}

              {analysis.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 space-y-1">
                  {analysis.warnings.slice(0, 3).map((w) => <p key={w}>{w}</p>)}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Source Column</th>
                      <th className="px-2 py-1.5 text-left text-gray-600 font-medium">Mapped Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analysis.rawHeaders.map((header) => (
                      <tr key={header}>
                        <td className="px-2 py-1.5 text-gray-800">{header}</td>
                        <td className="px-2 py-1.5 text-gray-600">{mappings[header] ?? "(ignored)"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={doQuickImport} loading={importing} disabled={!importReady || !mappingHealth.hasNameField} className="w-full md:w-auto">
                <Upload className="w-4 h-4" />Run Import
              </Button>
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

      {/* Specialized Exports */}
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
                {exportingByEndpoint[ex.endpoint] ? <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" /> : <Download className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{ex.label}</p>
                  <p className="text-xs text-gray-500 truncate">{ex.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import history */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><History className="w-4 h-4" />Recent Imports</h3>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">Valid support levels: {SUPPORT_LEVEL_VALUES.join(", ")}</p>
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
