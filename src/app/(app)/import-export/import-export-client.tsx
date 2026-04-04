"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader } from "@/components/ui";
import { toast } from "sonner";
import Papa from "papaparse";

interface Props { campaignId: string; }

interface ImportResult { imported: number; skipped: number; errors: string[]; }

const CSV_HEADERS = ["firstName", "lastName", "email", "phone", "address1", "address2", "city", "province", "postalCode", "ward", "riding", "supportLevel", "issues", "signRequested", "volunteerInterest", "doNotContact", "notes"];
const SUPPORT_LEVEL_VALUES = ["strong_support", "leaning_support", "undecided", "leaning_opposition", "strong_opposition", "unknown"];

export default function ImportExportClient({ campaignId }: Props) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [fileReady, setFileReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("CSV file has no data rows. Check that it has a header row and at least one data row.");
          return;
        }
        setPreview(results.data.slice(0, 5));
        setFileReady(true);
        setResult(null);
      },
      error: (err) => toast.error(`Failed to parse CSV: ${err.message}`),
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please drop a CSV file");
      return;
    }
    // Sync file to input ref so doImport can re-read it
    if (fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
    }
    parseFile(file);
  }, []);

  async function doImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch("/api/import-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId, rows: results.data }),
          });
          let data: { data?: ImportResult; error?: string };
          try {
            data = await res.json();
          } catch {
            toast.error("Unexpected response from server. Please try again.");
            return;
          }
          if (res.ok && data.data) {
            setResult(data.data);
            toast.success(`Imported ${data.data.imported} contacts`);
            // Reset input so the same file can be re-imported
            if (fileRef.current) fileRef.current.value = "";
          } else {
            toast.error(data.error ?? "Import failed");
          }
        } catch (err) {
          toast.error("Network error. Please check your connection and try again.");
        } finally {
          setImporting(false);
        }
      },
      error: (err) => {
        toast.error(`Failed to read file: ${err.message}`);
        setImporting(false);
      },
    });
  }

  async function doExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/import-export?campaignId=${campaignId}&type=contacts`);
      const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `contacts-export-${Date.now()}.csv`; a.click();
      toast.success("Export downloaded");
    } finally { setExporting(false); }
  }

  async function exportComplianceSnapshot() {
    const [contactsRes, donationsRes, signsRes, volunteersRes] = await Promise.all([
      fetch(`/api/contacts?campaignId=${campaignId}&pageSize=1`),
      fetch(`/api/donations?campaignId=${campaignId}&pageSize=1`),
      fetch(`/api/signs?campaignId=${campaignId}&pageSize=1`),
      fetch(`/api/volunteers?campaignId=${campaignId}&pageSize=1`),
    ]);

    const [contacts, donations, signs, volunteers] = await Promise.all([
      contactsRes.ok ? contactsRes.json() : { total: 0 },
      donationsRes.ok ? donationsRes.json() : { total: 0 },
      signsRes.ok ? signsRes.json() : { total: 0 },
      volunteersRes.ok ? volunteersRes.json() : { total: 0 },
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      campaignId,
      totals: {
        contacts: contacts?.total ?? 0,
        donations: donations?.total ?? 0,
        signs: signs?.total ?? 0,
        volunteers: volunteers?.total ?? 0,
      },
      note: "Campaign-scoped compliance snapshot generated from live APIs.",
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `compliance-snapshot-${Date.now()}.json`;
    a.click();
  }

  function downloadTemplate() {
    const csv = CSV_HEADERS.join(",") + "\nJane,Smith,jane@email.com,416-555-0100,123 Main St,,Toronto,ON,M4C 1A1,Ward 12,Toronto—Danforth,strong_support,Transit;Housing,yes,no,no,Great contact at the door";
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "poll-city-import-template.csv"; a.click();
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <PageHeader title="Import / Export" description="Bulk manage your voter contacts via CSV" />

      {/* Export */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">Export Contacts</h3></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Download all contacts in your campaign as a CSV file, including support levels, issues, tags, and interaction history.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={doExport} loading={exporting} variant="outline">
              <Download className="w-4 h-4" />Download CSV Export
            </Button>
            <Button onClick={exportComplianceSnapshot} variant="outline">
              <FileText className="w-4 h-4" />Compliance JSON Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Import Contacts</h3>
            <Button size="sm" variant="ghost" onClick={downloadTemplate}><FileText className="w-3.5 h-3.5" />Download Template</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Upload a CSV file to bulk import contacts. Required columns: <code className="bg-gray-100 px-1 rounded">firstName</code>, <code className="bg-gray-100 px-1 rounded">lastName</code></p>
            <p className="text-xs text-gray-400">Valid support levels: {SUPPORT_LEVEL_VALUES.join(", ")}</p>
          </div>

          {/* Drop zone */}
          <label
            className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50/60" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`w-8 h-8 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Click to upload CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">or drag and drop</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </label>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Preview (first {preview.length} rows)</p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>{Object.keys(preview[0]).slice(0, 6).map((k) => <th key={k} className="px-3 py-2 text-left text-gray-600 font-medium">{k}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, i) => (
                      <tr key={i}>{Object.values(row).slice(0, 6).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 truncate max-w-[100px]">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={doImport} loading={importing} disabled={!fileReady} className="mt-3 w-full">
                <Upload className="w-4 h-4" />Import Contacts
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.errors.length === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                <p className="text-sm font-medium">{result.imported} imported · {result.skipped} skipped</p>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">{result.errors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-amber-700">{e}</p>)}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
