"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent, Select } from "@/components/ui";
import { Printer, RefreshCw, FileText } from "lucide-react";
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
  supportLevel: SupportLevel | null;
  followUpNeeded: boolean;
  notes: string | null;
  signRequested: boolean;
  hasSign: boolean;
}

interface Props {
  campaignId: string;
  campaignName: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function extractStreetName(address1: string | null): string {
  if (!address1) return "Unknown Street";
  // Strip leading house number(s), return street name
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

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function PrintWalkListClient({ campaignId, campaignName }: Props) {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") ?? "";
  const wardParam = searchParams.get("ward") ?? "";

  const [contacts, setContacts] = useState<WalkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState(wardParam);
  const [supportFilter, setSupportFilter] = useState<string>("");
  const [wards, setWards] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ campaignId });
      if (idsParam) params.set("ids", idsParam);
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

      // Collect unique wards for filter dropdown
      const uniqueWards = Array.from(new Set(data.map((c) => c.ward).filter(Boolean))) as string[];
      setWards(uniqueWards.sort());
    } catch {
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [campaignId, idsParam, wardFilter]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = supportFilter
    ? contacts.filter((c) => c.supportLevel === supportFilter)
    : contacts;

  const groupedByStreet = groupByStreet(filteredContacts);
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <>
      {/* ── Print-specific global styles ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; }
          body { background: white !important; }
          .print-page-break { page-break-before: always; }
          @page {
            size: letter;
            margin: 0.6in 0.5in;
          }
        }
      `}</style>

      <div className="print-root max-w-5xl mx-auto px-4 py-6">

        {/* ── Toolbar (hidden on print) ── */}
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <FileText className="w-5 h-5 text-[#0A2342]" />
            <h1 className="text-xl font-bold text-[#0A2342]">Print Walk List</h1>
          </div>

          {/* Ward filter */}
          {wards.length > 0 && (
            <Select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-44 h-9 text-sm"
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          )}

          {/* Support level filter */}
          <Select
            value={supportFilter}
            onChange={(e) => setSupportFilter(e.target.value)}
            className="w-44 h-9 text-sm"
          >
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

        {/* ── Error state ── */}
        {error && (
          <Card className="no-print mb-4">
            <CardContent className="p-4 text-red-600 text-sm">{error}</CardContent>
          </Card>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <div className="no-print flex items-center justify-center py-20 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading contacts…
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && filteredContacts.length === 0 && (
          <div className="no-print flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No contacts found</p>
            <p className="text-sm mt-1">Try adjusting your filters or adding contacts first.</p>
          </div>
        )}

        {/* ── Print Document ── */}
        {!loading && filteredContacts.length > 0 && (
          <div className="print-document">
            {/* Document header */}
            <div className="mb-5 border-b-2 border-[#0A2342] pb-3">
              <h1 className="text-2xl font-extrabold text-[#0A2342]">Walk List</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
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
                  {/* Street header */}
                  <div className="bg-[#0A2342] text-white px-2.5 py-1 rounded-t text-xs font-bold uppercase tracking-wide">
                    {street}
                  </div>

                  {/* Contact cards */}
                  {streetContacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              ))}
            </div>

            {/* Footer (visible on print) */}
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
        </div>
        <div className="flex-shrink-0 text-right">
          {contact.supportLevel && (
            <span
              className={cn(
                "inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border leading-tight",
                supportBgClass(contact.supportLevel),
              )}
            >
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

      {/* Canvasser checkboxes */}
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
