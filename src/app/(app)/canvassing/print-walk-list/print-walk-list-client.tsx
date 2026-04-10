"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent, Select, Spinner } from "@/components/ui";
import { Printer, RefreshCw, FileText, ExternalLink, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// SupportLevel enum values from schema (snake_case)
const SupportLevel = {
  strong_support: "strong_support",
  leaning_support: "leaning_support",
  undecided: "undecided",
  leaning_opposition: "leaning_opposition",
  strong_opposition: "strong_opposition",
  unknown: "unknown",
} as const;
type SupportLevel = (typeof SupportLevel)[keyof typeof SupportLevel];

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface WalkContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  ward: string | null;
  municipalPoll?: string | null;
  supportLevel: SupportLevel | null;
  followUpNeeded: boolean;
  notes: string | null;
  signRequested: boolean;
  hasSign: boolean;
}

interface AssignmentOption {
  id: string;
  name: string;
  status: string;
  _count: { stops: number };
  targetWard?: string | null;
  targetPolls?: string[];
}

interface Props {
  campaignId: string;
  campaignName: string;
  /** "canvass" | "signs" | "lit-drop" — informs which assignments to show and what to print */
  mode?: "canvass" | "signs" | "lit-drop";
  /** Pre-select a specific assignment (e.g. from clicking Print on an assignment row) */
  defaultAssignmentId?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function extractStreetName(address1: string | null): string {
  if (!address1) return "Unknown Street";
  const match = address1.trim().match(/^\d+\s+(.*)/);
  return match ? match[1] : address1;
}

function groupByStreet(contacts: WalkContact[]): Map<string, WalkContact[]> {
  const map = new Map<string, WalkContact[]>();
  for (const contact of contacts) {
    const street = extractStreetName(contact.address1);
    if (!map.has(street)) map.set(street, []);
    map.get(street)!.push(contact);
  }
  return map;
}

function supportBgClass(level: SupportLevel | null): string {
  switch (level) {
    case SupportLevel.strong_support:
    case SupportLevel.leaning_support:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case SupportLevel.undecided:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case SupportLevel.leaning_opposition:
    case SupportLevel.strong_opposition:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function supportLabel(level: SupportLevel | null): string {
  switch (level) {
    case SupportLevel.strong_support: return "Strong Support";
    case SupportLevel.leaning_support: return "Lean Support";
    case SupportLevel.undecided: return "Undecided";
    case SupportLevel.leaning_opposition: return "Lean Oppose";
    case SupportLevel.strong_opposition: return "Oppose";
    default: return "Unknown";
  }
}

const MODE_ASSIGNMENT_TYPE: Record<NonNullable<Props["mode"]>, string> = {
  canvass: "canvass",
  signs: "sign_install",
  "lit-drop": "lit_drop",
};

const MODE_LABEL: Record<NonNullable<Props["mode"]>, string> = {
  canvass: "Walk List",
  signs: "Sign Crew Sheet",
  "lit-drop": "Lit Drop Run Sheet",
};

/* ─── Panel Mode (configuration inside Field Ops side panel) ─────────────────── */

/**
 * When rendered as a side panel within Field Ops, this component shows a
 * configuration UI: pick an assignment, pick filters, then "Open Print Preview"
 * which opens the isolated /field-ops/print page in a new tab (no app chrome).
 *
 * When rendered standalone (at /field-ops/print), it renders the full print document
 * and auto-triggers window.print() on load.
 */
export default function PrintWalkListClient({ campaignId, campaignName, mode = "canvass", defaultAssignmentId }: Props) {
  const searchParams = useSearchParams();

  // Detect if we're on the standalone print page (no app chrome)
  const isStandalone = searchParams.get("standalone") === "1";

  // Standalone mode: read params from URL and auto-print
  const urlAssignmentId = searchParams.get("assignmentId") ?? defaultAssignmentId ?? "";
  const urlWard = searchParams.get("ward") ?? "";
  const urlSupport = searchParams.get("support") ?? "";

  // Panel state
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(urlAssignmentId);
  const [wardFilter, setWardFilter] = useState(urlWard);
  const [supportFilter, setSupportFilter] = useState(urlSupport);

  // Preview / print content state
  const [contacts, setContacts] = useState<WalkContact[]>([]);
  const [loading, setLoading] = useState(isStandalone); // start loading only in standalone
  const [wards, setWards] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load assignments for the selector (panel mode only)
  useEffect(() => {
    if (isStandalone) return;
    setAssignmentsLoading(true);
    const assignmentType = MODE_ASSIGNMENT_TYPE[mode];
    fetch(`/api/field-assignments?campaignId=${campaignId}&type=${assignmentType}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setAssignments(d.data ?? []))
      .catch(() => {})
      .finally(() => setAssignmentsLoading(false));
  }, [campaignId, mode, isStandalone]);

  // Fetch contacts — runs in standalone mode or when preview is requested
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ campaignId });
      if (selectedAssignmentId) params.set("assignmentId", selectedAssignmentId);
      if (wardFilter) params.set("wardId", wardFilter);

      const res = await fetch(`/api/print/walk-list?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load contacts");
        return;
      }
      const json = await res.json();
      const data: WalkContact[] = json.data ?? [];
      setContacts(data);

      const uniqueWards = Array.from(new Set(data.map((c) => c.ward).filter(Boolean))) as string[];
      setWards(uniqueWards.sort());
    } catch {
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedAssignmentId, wardFilter]);

  // Auto-fetch in standalone mode on mount
  useEffect(() => {
    if (isStandalone) void fetchContacts();
  }, [isStandalone, fetchContacts]);

  // Auto-print after contacts load in standalone mode
  useEffect(() => {
    if (isStandalone && !loading && contacts.length > 0) {
      setTimeout(() => window.print(), 400);
    }
  }, [isStandalone, loading, contacts.length]);

  const filteredContacts = supportFilter
    ? contacts.filter((c) => c.supportLevel === supportFilter)
    : contacts;

  const groupedByStreet = groupByStreet(filteredContacts);
  const today = new Date().toLocaleDateString("en-CA");

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Build the URL for the print preview new tab
  function buildPrintUrl() {
    const p = new URLSearchParams({ campaignId, standalone: "1" });
    if (selectedAssignmentId) p.set("assignmentId", selectedAssignmentId);
    if (wardFilter) p.set("ward", wardFilter);
    if (supportFilter) p.set("support", supportFilter);
    return `/field-ops/print?${p.toString()}`;
  }

  // ── Panel mode UI ─────────────────────────────────────────────────────────────

  if (!isStandalone) {
    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0A2342]" />
          <span className="font-semibold text-sm text-[#0A2342]">{MODE_LABEL[mode]}</span>
        </div>

        {/* Assignment selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">
            Which deployment are you printing for?
          </label>
          {assignmentsLoading ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-white text-xs text-gray-400">
              <Spinner className="h-3 w-3" /> Loading assignments…
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-2.5 text-xs text-gray-400 flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5" />
              No active {mode === "canvass" ? "canvass" : mode === "signs" ? "sign" : "lit drop"} assignments.
              Deploy a team first.
            </div>
          ) : (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
            >
              <option value="">All contacts (no specific deployment)</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a._count.stops} stops
                  {a.targetWard ? ` · ${a.targetWard}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Ward filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Ward filter (optional)</label>
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
          >
            <option value="">All wards</option>
            {/* Populate from assignment's ward if available, otherwise show field */}
            {selectedAssignment?.targetWard && (
              <option value={selectedAssignment.targetWard}>{selectedAssignment.targetWard}</option>
            )}
          </select>
        </div>

        {/* Support level filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Support level (optional)</label>
          <select
            value={supportFilter}
            onChange={(e) => setSupportFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
          >
            <option value="">All support levels</option>
            <option value={SupportLevel.strong_support}>Strong Support only</option>
            <option value={SupportLevel.leaning_support}>Lean Support only</option>
            <option value={SupportLevel.undecided}>Undecided only</option>
            <option value={SupportLevel.leaning_opposition}>Lean Oppose only</option>
            <option value={SupportLevel.strong_opposition}>Oppose only</option>
          </select>
        </div>

        {/* Context hint */}
        {selectedAssignment && (
          <div className="rounded-md bg-[#0A2342]/5 px-3 py-2 text-xs text-[#0A2342]">
            <strong>{selectedAssignment._count.stops} stops</strong> in this deployment
            {selectedAssignment.targetWard ? ` · ${selectedAssignment.targetWard}` : ""}
            {selectedAssignment.targetPolls?.length ? ` · ${selectedAssignment.targetPolls.join(", ")}` : ""}
          </div>
        )}

        {/* Open Print Preview — opens the isolated print page in a new tab */}
        <Button
          className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 text-white"
          onClick={() => window.open(buildPrintUrl(), "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Print Preview
        </Button>
        <p className="text-[10px] text-gray-400 text-center leading-tight">
          Opens in a new tab — use your browser's Print or Save as PDF from there.
        </p>
      </div>
    );
  }

  // ── Standalone print page ─────────────────────────────────────────────────────

  return (
    <>
      {/* Print-specific global styles — standalone page only */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page-break { page-break-before: always; }
          @page {
            size: letter;
            margin: 0.6in 0.5in;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Toolbar — hidden on print */}
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <FileText className="w-5 h-5 text-[#0A2342]" />
            <h1 className="text-xl font-bold text-[#0A2342]">{MODE_LABEL[mode]}</h1>
          </div>

          {wards.length > 0 && (
            <Select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="w-44 h-9 text-sm">
              <option value="">All wards</option>
              {wards.map((w) => <option key={w} value={w}>{w}</option>)}
            </Select>
          )}

          <Select value={supportFilter} onChange={(e) => setSupportFilter(e.target.value)} className="w-44 h-9 text-sm">
            <option value="">All support levels</option>
            <option value={SupportLevel.strong_support}>Strong Support</option>
            <option value={SupportLevel.leaning_support}>Lean Support</option>
            <option value={SupportLevel.undecided}>Undecided</option>
            <option value={SupportLevel.leaning_opposition}>Lean Oppose</option>
            <option value={SupportLevel.strong_opposition}>Oppose</option>
          </Select>

          <Button size="sm" variant="outline" onClick={fetchContacts} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>

          <Button
            size="sm"
            onClick={() => window.print()}
            disabled={loading || filteredContacts.length === 0}
            className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>

        {error && (
          <Card className="no-print mb-4">
            <CardContent className="p-4 text-red-600 text-sm">{error}</CardContent>
          </Card>
        )}

        {loading && (
          <div className="no-print flex items-center justify-center py-20 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading {MODE_LABEL[mode].toLowerCase()}…
          </div>
        )}

        {!loading && !error && filteredContacts.length === 0 && (
          <div className="no-print flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No contacts found</p>
            <p className="text-sm mt-1">Try adjusting your filters or selecting a deployment.</p>
          </div>
        )}

        {!loading && filteredContacts.length > 0 && (
          <div className="print-document">
            {/* Document header */}
            <div className="mb-5 border-b-2 border-[#0A2342] pb-3">
              <h1 className="text-2xl font-extrabold text-[#0A2342]">{MODE_LABEL[mode]}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-600">
                <span className="font-semibold">{campaignName}</span>
                <span>•</span>
                <span>{today}</span>
                <span>•</span>
                <span>{filteredContacts.length} contacts</span>
                {wardFilter && <><span>•</span><span>Ward: {wardFilter}</span></>}
              </div>
            </div>

            {/* Contacts grouped by street — two-column layout */}
            <div className="columns-2 gap-5 space-y-0">
              {Array.from(groupedByStreet.entries()).map(([street, streetContacts]) => (
                <div key={street} className="break-inside-avoid mb-4">
                  <div className="bg-[#0A2342] text-white px-2.5 py-1 rounded-t text-xs font-bold uppercase tracking-wide">
                    {street}
                  </div>
                  {streetContacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-gray-200 text-xs text-gray-400 text-center no-print">
              {filteredContacts.length} contacts printed — {campaignName} — {today}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Contact Card ───────────────────────────────────────────────────────────── */

function ContactCard({ contact }: { contact: WalkContact }) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown";
  const addressLine2 = [contact.address2, contact.city].filter(Boolean).join(", ");

  return (
    <div className="border border-gray-200 border-t-0 px-2.5 py-2 bg-white last:rounded-b break-inside-avoid">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-gray-900 leading-tight truncate">{name}</p>
          {contact.address1 && (
            <p className="text-xs text-gray-500 leading-tight">{contact.address1}</p>
          )}
          {addressLine2 && (
            <p className="text-xs text-gray-400 leading-tight">{addressLine2}</p>
          )}
          {contact.phone && (
            <p className="text-xs text-gray-600 mt-0.5">{contact.phone}</p>
          )}
          {contact.municipalPoll && (
            <p className="text-[9px] text-blue-600 font-medium mt-0.5">{contact.municipalPoll}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          {contact.supportLevel && (
            <span className={cn("inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border leading-tight", supportBgClass(contact.supportLevel))}>
              {supportLabel(contact.supportLevel)}
            </span>
          )}
          {contact.signRequested && (
            <span className="block text-[9px] text-amber-700 font-semibold mt-0.5">Sign Req</span>
          )}
          {contact.hasSign && (
            <span className="block text-[9px] text-emerald-700 font-semibold mt-0.5">Has Sign</span>
          )}
        </div>
      </div>

      {contact.notes && (
        <p className="text-[10px] text-gray-500 mt-1 italic line-clamp-2 leading-tight">{contact.notes}</p>
      )}

      <div className="flex gap-3 mt-1.5">
        <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" className="w-3 h-3 rounded" />
          Contacted
        </label>
        <label className={cn(
          "flex items-center gap-1 text-[10px] cursor-pointer select-none",
          contact.followUpNeeded ? "text-amber-600 font-semibold" : "text-gray-500",
        )}>
          <input type="checkbox" className="w-3 h-3 rounded" defaultChecked={contact.followUpNeeded} />
          Follow-up
        </label>
      </div>
    </div>
  );
}
