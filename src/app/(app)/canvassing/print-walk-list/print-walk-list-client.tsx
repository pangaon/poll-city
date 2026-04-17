"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { Printer, RefreshCw, FileText, ExternalLink, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

const SupportLevel = {
  strong_support: "strong_support",
  leaning_support: "leaning_support",
  undecided: "undecided",
  leaning_opposition: "leaning_opposition",
  strong_opposition: "strong_opposition",
  unknown: "unknown",
} as const;
type SupportLevel = (typeof SupportLevel)[keyof typeof SupportLevel];

type TemplateId = "standard" | "compact" | "signs" | "gotv";

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
  mode?: "canvass" | "signs" | "lit-drop";
  defaultAssignmentId?: string;
  defaultTemplate?: TemplateId;
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */

const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: "standard", label: "Walk List (Standard)", hint: "2-col · Full detail · Field notes · Daily canvassing" },
  { id: "compact",  label: "Strike Sheet (Compact)", hint: "3-col · High density · Best for 60+ contacts" },
  { id: "signs",    label: "Sign Crew Sheet", hint: "2-col · Address-first · Install checkboxes" },
  { id: "gotv",     label: "GOTV Knock Sheet", hint: "2-col · Poll # prominent · E-Day checkboxes" },
];

const MODE_ASSIGNMENT_TYPE: Record<NonNullable<Props["mode"]>, string> = {
  canvass: "canvass",
  signs: "sign_install",
  "lit-drop": "lit_drop",
};

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

function supportLabel(level: SupportLevel | null): string {
  switch (level) {
    case "strong_support":    return "Strong Support";
    case "leaning_support":   return "Lean Support";
    case "undecided":         return "Undecided";
    case "leaning_opposition": return "Lean Oppose";
    case "strong_opposition": return "Oppose";
    default:                  return "Unknown";
  }
}

function supportStyle(level: SupportLevel | null): React.CSSProperties {
  switch (level) {
    case "strong_support":    return { background: "#059669", color: "white" };
    case "leaning_support":   return { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" };
    case "undecided":         return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
    case "leaning_opposition": return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    case "strong_opposition": return { background: "#dc2626", color: "white" };
    default:                  return { background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" };
  }
}

function supportAbbrev(level: SupportLevel | null): string {
  switch (level) {
    case "strong_support":    return "SS";
    case "leaning_support":   return "LS";
    case "undecided":         return "UN";
    case "leaning_opposition": return "LO";
    case "strong_opposition": return "SO";
    default:                  return "??";
  }
}

/* ─── Print CSS ──────────────────────────────────────────────────────────────── */

const PRINT_CSS = `
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  body { background: white !important; }
  @page {
    size: letter;
    margin: 0.5in 0.45in 0.6in;
  }
  @page :first { margin-top: 0.5in; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .print-page-break { break-before: page; page-break-before: always; }
`;

/* ─── Document Header (shared across all templates) ──────────────────────────── */

function DocHeader({
  campaignName,
  assignmentName,
  contactCount,
  title,
  today,
}: {
  campaignName: string;
  assignmentName?: string;
  contactCount: number;
  title: string;
  today: string;
}) {
  return (
    <div style={{ borderBottom: "3px solid #0A2342", marginBottom: "14px", paddingBottom: "10px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#1D9E75", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "3px" }}>
            Poll City — Field Operations
          </div>
          <div style={{ fontSize: "18pt", fontWeight: 900, color: "#0A2342", lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ fontSize: "9.5pt", color: "#444", marginTop: "3px" }}>
            {campaignName}{assignmentName ? ` · ${assignmentName}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "8.5pt", color: "#555", lineHeight: 1.6 }}>
          <div><strong>Date:</strong> {today}</div>
          <div><strong>Contacts:</strong> {contactCount}</div>
          <div style={{ fontSize: "7pt", color: "#aaa", marginTop: "2px" }}>CONFIDENTIAL</div>
        </div>
      </div>

      {/* Canvasser sign-in row */}
      <div style={{ marginTop: "10px", display: "flex", gap: "28px", fontSize: "8.5pt", color: "#333", flexWrap: "wrap" }}>
        {(["Canvasser", "Team", "Start", "End"] as const).map((label) => (
          <span key={label}>
            {label}:{" "}
            <span style={{ display: "inline-block", width: label === "Canvasser" ? "130px" : label === "Team" ? "100px" : "70px", borderBottom: "1px solid #777" }}>
              &nbsp;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Street group header (shared) ───────────────────────────────────────────── */

function StreetHeader({ name }: { name: string }) {
  return (
    <div style={{
      background: "#0A2342",
      color: "white",
      padding: "3px 8px",
      borderRadius: "3px 3px 0 0",
      fontSize: "7.5pt",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      fontFamily: "Arial, Helvetica, sans-serif",
    }}>
      {name}
    </div>
  );
}

/* ─── Template 1: Standard Walk List ─────────────────────────────────────────── */

function StandardTemplate({ contacts, campaignName, assignmentName }: { contacts: WalkContact[]; campaignName: string; assignmentName?: string }) {
  const grouped = groupByStreet(contacts);
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <DocHeader campaignName={campaignName} assignmentName={assignmentName} contactCount={contacts.length} title="Walk List" today={today} />
      <div style={{ columns: "2", columnGap: "18px" }}>
        {Array.from(grouped.entries()).map(([street, streetContacts]) => (
          <div key={street} className="avoid-break" style={{ breakInside: "avoid", marginBottom: "12px", display: "inline-block", width: "100%" }}>
            <StreetHeader name={street} />
            {streetContacts.map((c) => <StandardCard key={c.id} contact={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StandardCard({ contact }: { contact: WalkContact }) {
  const name = [contact.lastName?.toUpperCase(), contact.firstName].filter(Boolean).join(", ") || "UNKNOWN";
  return (
    <div className="avoid-break" style={{ border: "1px solid #d1d5db", borderTop: "none", padding: "6px 8px", background: "white", breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "10pt", color: "#111", lineHeight: 1.2 }}>{name}</div>
          {contact.address1 && (
            <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "1px" }}>{contact.address1}</div>
          )}
          {contact.phone && (
            <div style={{ fontSize: "8.5pt", color: "#555", marginTop: "1px" }}>{contact.phone}</div>
          )}
          {contact.municipalPoll && (
            <div style={{ fontSize: "7.5pt", color: "#1a6fae", fontWeight: 600, marginTop: "1px" }}>
              Poll: {contact.municipalPoll}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {contact.supportLevel && contact.supportLevel !== "unknown" && (
            <span style={{ display: "inline-block", fontSize: "6.5pt", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", ...supportStyle(contact.supportLevel) }}>
              {supportLabel(contact.supportLevel)}
            </span>
          )}
          {contact.signRequested && !contact.hasSign && (
            <div style={{ fontSize: "6.5pt", color: "#d97706", fontWeight: 600, marginTop: "2px" }}>Sign Req</div>
          )}
          {contact.hasSign && (
            <div style={{ fontSize: "6.5pt", color: "#059669", fontWeight: 600, marginTop: "2px" }}>Has Sign ✓</div>
          )}
        </div>
      </div>

      {contact.notes && (
        <div style={{ fontSize: "7.5pt", color: "#6b7280", fontStyle: "italic", marginTop: "3px", paddingTop: "2px", borderTop: "1px solid #f3f4f6" }}>
          {contact.notes}
        </div>
      )}

      {/* Field note lines */}
      <div style={{ marginTop: "5px", borderTop: "1px dashed #e5e7eb", paddingTop: "4px" }}>
        <div style={{ borderBottom: "1px solid #d1d5db", height: "14px", marginBottom: "5px" }} />
        <div style={{ borderBottom: "1px solid #d1d5db", height: "14px", marginBottom: "4px" }} />
      </div>

      <div style={{ display: "flex", gap: "14px", marginTop: "3px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "7.5pt", color: "#555" }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Contacted
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "7.5pt", color: contact.followUpNeeded ? "#b45309" : "#555", fontWeight: contact.followUpNeeded ? 700 : 400 }}>
          <input type="checkbox" defaultChecked={contact.followUpNeeded} style={{ width: "10px", height: "10px" }} /> Follow-up
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "7.5pt", color: "#555" }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Not Home
        </label>
      </div>
    </div>
  );
}

/* ─── Template 2: Compact Strike Sheet ───────────────────────────────────────── */

function CompactTemplate({ contacts, campaignName, assignmentName }: { contacts: WalkContact[]; campaignName: string; assignmentName?: string }) {
  const grouped = groupByStreet(contacts);
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <DocHeader campaignName={campaignName} assignmentName={assignmentName} contactCount={contacts.length} title="Strike Sheet" today={today} />
      <div style={{ columns: "3", columnGap: "12px" }}>
        {Array.from(grouped.entries()).map(([street, streetContacts]) => (
          <div key={street} className="avoid-break" style={{ breakInside: "avoid", marginBottom: "10px", display: "inline-block", width: "100%" }}>
            <StreetHeader name={street} />
            {streetContacts.map((c) => <CompactCard key={c.id} contact={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactCard({ contact }: { contact: WalkContact }) {
  const name = [contact.lastName?.toUpperCase(), contact.firstName].filter(Boolean).join(", ") || "UNKNOWN";
  return (
    <div className="avoid-break" style={{ border: "1px solid #e5e7eb", borderTop: "none", padding: "4px 6px", background: "white", breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2px" }}>
        <div style={{ fontWeight: 700, fontSize: "7.5pt", color: "#111", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {contact.supportLevel && contact.supportLevel !== "unknown" && (
          <span style={{ fontSize: "6pt", fontWeight: 700, padding: "1px 3px", borderRadius: "2px", flexShrink: 0, ...supportStyle(contact.supportLevel) }}>
            {supportAbbrev(contact.supportLevel)}
          </span>
        )}
      </div>
      {contact.address1 && <div style={{ fontSize: "7pt", color: "#555" }}>{contact.address1}</div>}
      {contact.phone && <div style={{ fontSize: "7pt", color: "#666" }}>{contact.phone}</div>}
      <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "6.5pt", color: "#555" }}>
          <input type="checkbox" style={{ width: "9px", height: "9px" }} /> Done
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "6.5pt", color: "#555" }}>
          <input type="checkbox" style={{ width: "9px", height: "9px" }} /> NH
        </label>
      </div>
    </div>
  );
}

/* ─── Template 3: Sign Crew Sheet ─────────────────────────────────────────────── */

function SignsTemplate({ contacts, campaignName, assignmentName }: { contacts: WalkContact[]; campaignName: string; assignmentName?: string }) {
  const grouped = groupByStreet(contacts);
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <DocHeader campaignName={campaignName} assignmentName={assignmentName} contactCount={contacts.length} title="Sign Crew Sheet" today={today} />
      <div style={{ columns: "2", columnGap: "18px" }}>
        {Array.from(grouped.entries()).map(([street, streetContacts]) => (
          <div key={street} className="avoid-break" style={{ breakInside: "avoid", marginBottom: "12px", display: "inline-block", width: "100%" }}>
            <StreetHeader name={street} />
            {streetContacts.map((c) => <SignCard key={c.id} contact={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignCard({ contact }: { contact: WalkContact }) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown";
  return (
    <div className="avoid-break" style={{ border: "1px solid #d1d5db", borderTop: "none", padding: "8px 10px", background: "white", breakInside: "avoid" }}>
      {/* Address big — driver calls this out */}
      <div style={{ fontSize: "13pt", fontWeight: 900, color: "#0A2342", lineHeight: 1.15 }}>
        {contact.address1 || "No address on file"}
      </div>
      {contact.address2 && (
        <div style={{ fontSize: "9pt", color: "#555" }}>{contact.address2}</div>
      )}
      <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "2px" }}>
        {name}{contact.phone ? ` · ${contact.phone}` : ""}
      </div>
      {contact.hasSign && (
        <div style={{ fontSize: "8pt", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
          ✓ Sign already placed
        </div>
      )}
      {contact.notes && (
        <div style={{ fontSize: "8pt", color: "#777", fontStyle: "italic", marginTop: "3px" }}>{contact.notes}</div>
      )}
      <div style={{ display: "flex", gap: "12px", marginTop: "7px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8.5pt", color: "#059669", fontWeight: 700 }}>
          <input type="checkbox" style={{ width: "12px", height: "12px" }} /> Installed ✓
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8.5pt", color: "#333" }}>
          <input type="checkbox" style={{ width: "12px", height: "12px" }} /> Left Note
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8.5pt", color: "#333" }}>
          <input type="checkbox" style={{ width: "12px", height: "12px" }} /> No Access
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "8.5pt", color: "#b45309" }}>
          <input type="checkbox" style={{ width: "12px", height: "12px" }} /> HOA — Skip
        </label>
      </div>
      <div style={{ marginTop: "6px" }}>
        <div style={{ fontSize: "7pt", color: "#9ca3af", marginBottom: "2px" }}>Notes:</div>
        <div style={{ borderBottom: "1px solid #d1d5db", height: "14px" }} />
      </div>
    </div>
  );
}

/* ─── Template 4: GOTV Knock Sheet ───────────────────────────────────────────── */

function GOTVTemplate({ contacts, campaignName, assignmentName }: { contacts: WalkContact[]; campaignName: string; assignmentName?: string }) {
  const grouped = groupByStreet(contacts);
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <DocHeader campaignName={campaignName} assignmentName={assignmentName} contactCount={contacts.length} title="GOTV Knock Sheet" today={today} />
      <div style={{ columns: "2", columnGap: "18px" }}>
        {Array.from(grouped.entries()).map(([street, streetContacts]) => (
          <div key={street} className="avoid-break" style={{ breakInside: "avoid", marginBottom: "12px", display: "inline-block", width: "100%" }}>
            <StreetHeader name={street} />
            {streetContacts.map((c) => <GOTVCard key={c.id} contact={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function GOTVCard({ contact }: { contact: WalkContact }) {
  const name = [contact.lastName?.toUpperCase(), contact.firstName].filter(Boolean).join(", ") || "UNKNOWN";
  return (
    <div className="avoid-break" style={{ border: "1px solid #d1d5db", borderTop: "none", padding: "6px 8px", background: "white", breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        {/* Poll badge — prominent */}
        <div style={{
          flexShrink: 0,
          background: contact.municipalPoll ? "#0A2342" : "#f3f4f6",
          color: contact.municipalPoll ? "white" : "#d1d5db",
          borderRadius: "4px",
          padding: "3px 5px",
          textAlign: "center",
          minWidth: "40px",
        }}>
          <div style={{ fontSize: "5.5pt", fontWeight: 600, letterSpacing: "0.05em", lineHeight: 1, color: contact.municipalPoll ? "#93c5fd" : "#d1d5db" }}>
            POLL
          </div>
          <div style={{ fontSize: "11pt", fontWeight: 900, lineHeight: 1.1 }}>
            {contact.municipalPoll ?? "—"}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "9.5pt", color: "#111", lineHeight: 1.2 }}>{name}</div>
          {contact.address1 && <div style={{ fontSize: "8pt", color: "#444", marginTop: "1px" }}>{contact.address1}</div>}
          {contact.phone && <div style={{ fontSize: "8pt", color: "#555" }}>{contact.phone}</div>}
        </div>

        {contact.supportLevel && contact.supportLevel !== "unknown" && (
          <span style={{ flexShrink: 0, fontSize: "6.5pt", fontWeight: 700, padding: "2px 4px", borderRadius: "3px", ...supportStyle(contact.supportLevel) }}>
            {supportLabel(contact.supportLevel)}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "7.5pt", color: "#059669", fontWeight: 700 }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Voted ✓
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "7.5pt", color: "#333" }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Needs Ride
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "7.5pt", color: "#333" }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Canvassed
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "7.5pt", color: "#333" }}>
          <input type="checkbox" style={{ width: "10px", height: "10px" }} /> Door Hanger
        </label>
      </div>
    </div>
  );
}

/* ─── Template renderer ───────────────────────────────────────────────────────── */

function PrintDocument({
  contacts,
  campaignName,
  assignmentName,
  template,
}: {
  contacts: WalkContact[];
  campaignName: string;
  assignmentName?: string;
  template: TemplateId;
}) {
  switch (template) {
    case "compact": return <CompactTemplate contacts={contacts} campaignName={campaignName} assignmentName={assignmentName} />;
    case "signs":   return <SignsTemplate   contacts={contacts} campaignName={campaignName} assignmentName={assignmentName} />;
    case "gotv":    return <GOTVTemplate    contacts={contacts} campaignName={campaignName} assignmentName={assignmentName} />;
    default:        return <StandardTemplate contacts={contacts} campaignName={campaignName} assignmentName={assignmentName} />;
  }
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export default function PrintWalkListClient({
  campaignId,
  campaignName,
  mode = "canvass",
  defaultAssignmentId,
  defaultTemplate = "standard",
}: Props) {
  const searchParams = useSearchParams();

  const isStandalone = searchParams?.get("standalone") === "1";

  const urlAssignmentId   = searchParams?.get("assignmentId")   ?? defaultAssignmentId ?? "";
  const urlAssignmentName = searchParams?.get("assignmentName") ?? "";
  const urlTemplate       = (searchParams?.get("template") ?? defaultTemplate) as TemplateId;
  const urlWard           = searchParams?.get("ward")    ?? "";
  const urlSupport        = searchParams?.get("support") ?? "";

  // Panel state
  const [assignments, setAssignments]         = useState<AssignmentOption[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(urlAssignmentId);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(urlTemplate);
  const [wardFilter, setWardFilter]           = useState(urlWard);
  const [supportFilter, setSupportFilter]     = useState(urlSupport);

  // Print content state
  const [contacts, setContacts]   = useState<WalkContact[]>([]);
  const [loading, setLoading]     = useState(isStandalone);
  const [wards, setWards]         = useState<string[]>([]);
  const [error, setError]         = useState<string | null>(null);

  // Load assignments (panel mode only)
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
        setError((body as { error?: string }).error ?? "Failed to load contacts");
        return;
      }
      const json = await res.json() as { data?: WalkContact[] };
      const data: WalkContact[] = json.data ?? [];
      setContacts(data);

      const uniqueWards = Array.from(new Set(data.map((c) => c.ward).filter((w): w is string => w !== null && w !== "")));
      setWards(uniqueWards.sort());
    } catch {
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedAssignmentId, wardFilter]);

  // Auto-fetch in standalone
  useEffect(() => {
    if (isStandalone) void fetchContacts();
  }, [isStandalone, fetchContacts]);

  // Auto-print in standalone after contacts load
  useEffect(() => {
    if (isStandalone && !loading && contacts.length > 0) {
      setTimeout(() => window.print(), 450);
    }
  }, [isStandalone, loading, contacts.length]);

  const filteredContacts = supportFilter
    ? contacts.filter((c) => c.supportLevel === supportFilter)
    : contacts;

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const templateMeta = TEMPLATES.find((t) => t.id === selectedTemplate) ?? TEMPLATES[0];

  function buildPrintUrl() {
    const p = new URLSearchParams({ campaignId, standalone: "1", template: selectedTemplate });
    if (selectedAssignmentId) {
      p.set("assignmentId", selectedAssignmentId);
      if (selectedAssignment) p.set("assignmentName", selectedAssignment.name);
    }
    if (wardFilter) p.set("ward", wardFilter);
    if (supportFilter) p.set("support", supportFilter);
    return `/print/walk-list?${p.toString()}`;
  }

  /* ── Panel mode ──────────────────────────────────────────────────────────────── */

  if (!isStandalone) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0A2342]" />
          <span className="font-semibold text-sm text-[#0A2342]">Print Walk List</span>
        </div>

        {/* Template selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Template</label>
          <div className="space-y-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  "w-full text-left rounded-md border px-3 py-2 transition-colors",
                  selectedTemplate === t.id
                    ? "border-[#0A2342] bg-[#0A2342]/5 text-[#0A2342]"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                )}
              >
                <div className="text-xs font-semibold leading-tight">{t.label}</div>
                <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{t.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Assignment selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Deployment (optional)</label>
          {assignmentsLoading ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-white text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-md border border-dashed px-3 py-2.5 text-xs text-gray-400 flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5" /> No active assignments.
            </div>
          ) : (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
            >
              <option value="">All contacts</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a._count.stops} stops
                  {a.targetWard ? ` · ${a.targetWard}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Support filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Support level filter</label>
          <select
            value={supportFilter}
            onChange={(e) => setSupportFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
          >
            <option value="">All support levels</option>
            <option value="strong_support">Strong Support only</option>
            <option value="leaning_support">Lean Support only</option>
            <option value="undecided">Undecided only</option>
            <option value="leaning_opposition">Lean Oppose only</option>
            <option value="strong_opposition">Oppose only</option>
          </select>
        </div>

        {/* Info strip */}
        {selectedAssignment && (
          <div className="rounded-md bg-[#0A2342]/5 px-3 py-2 text-xs text-[#0A2342]">
            <strong>{selectedAssignment._count.stops} stops</strong>
            {selectedAssignment.targetWard ? ` · ${selectedAssignment.targetWard}` : ""}
          </div>
        )}

        <Button
          className="w-full bg-[#0A2342] hover:bg-[#0A2342]/90 text-white"
          onClick={() => window.open(buildPrintUrl(), "_blank")}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Print Preview
        </Button>

        <p className="text-[10px] text-gray-400 text-center leading-tight">
          Opens in a new tab. Use browser Print or Save as PDF.
        </p>
      </div>
    );
  }

  /* ── Standalone print page ───────────────────────────────────────────────────── */

  return (
    <>
      <style>{`@media print { ${PRINT_CSS} }`}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Toolbar */}
        <div className="no-print mb-5 flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mr-auto">
            <FileText className="w-5 h-5 text-[#0A2342]" />
            <span className="font-bold text-[#0A2342]">{templateMeta.label}</span>
          </div>

          <select
            value={urlTemplate}
            onChange={(e) => {
              const p = new URLSearchParams(window.location.search);
              p.set("template", e.target.value);
              window.location.search = p.toString();
            }}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {wards.length > 0 && (
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="h-9 w-40 rounded-md border border-gray-300 bg-white px-2 text-sm"
            >
              <option value="">All wards</option>
              {wards.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          )}

          <select
            value={supportFilter}
            onChange={(e) => setSupportFilter(e.target.value)}
            className="h-9 w-44 rounded-md border border-gray-300 bg-white px-2 text-sm"
          >
            <option value="">All support levels</option>
            <option value="strong_support">Strong Support</option>
            <option value="leaning_support">Lean Support</option>
            <option value="undecided">Undecided</option>
            <option value="leaning_opposition">Lean Oppose</option>
            <option value="strong_opposition">Oppose</option>
          </select>

          <button
            onClick={fetchContacts}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>

          <Button
            onClick={() => window.print()}
            disabled={loading || filteredContacts.length === 0}
            className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white h-9 px-4"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>

        {error && (
          <div className="no-print mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="no-print flex items-center justify-center py-20 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        )}

        {!loading && !error && filteredContacts.length === 0 && (
          <div className="no-print flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No contacts found</p>
            <p className="text-sm mt-1">Adjust filters or select a deployment.</p>
          </div>
        )}

        {!loading && filteredContacts.length > 0 && (
          <PrintDocument
            contacts={filteredContacts}
            campaignName={campaignName}
            assignmentName={urlAssignmentName || undefined}
            template={urlTemplate}
          />
        )}
      </div>
    </>
  );
}
