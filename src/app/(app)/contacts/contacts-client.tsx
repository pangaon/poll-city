"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Download, Upload, Filter, Phone, Mail, ChevronLeft, ChevronRight, CheckSquare, Bookmark, Save, Trash2, GripVertical, SlidersHorizontal } from "lucide-react";
import { Button, Input, Select, Card, PageHeader, EmptyState, SupportLevelBadge, Modal, FormField, Textarea, Checkbox, Badge, ContactAutocomplete, MultiSelect, Spinner } from "@/components/ui";
import { fullName, formatDate, formatPhone, cn } from "@/lib/utils";
import { SUPPORT_LEVEL_LABELS, COMMON_ISSUES, SupportLevel } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContactSchema, CreateContactInput } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";
import { Tag } from "@prisma/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { ContactSlideOver } from "@/components/contacts/contact-slideover";

interface ContactRow {
  id: string; firstName: string; lastName: string; email: string | null;
  phone: string | null; supportLevel: SupportLevel; followUpNeeded: boolean;
  volunteerInterest: boolean; signRequested: boolean; ward: string | null;
  lastContactedAt: string | null;
  // Extended fields for dynamic columns
  address1?: string | null; city?: string | null; postalCode?: string | null;
  riding?: string | null; gotvStatus?: string | null; doNotContact?: boolean;
  issues?: string[]; notes?: string | null; followUpDate?: string | null;
  captain?: string | null; signPlaced?: boolean; superSupporter?: boolean;
  partyMember?: boolean; preferredLanguage?: string | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { interactions: number };
}

interface Props {
  campaignId: string; campaignName: string;
  tags: Tag[]; teamMembers: { id: string; name: string | null; email: string | null }[];
  userRole: string;
}

const pageSize = 25;

type ColumnKey =
  | "name" | "contact" | "support" | "ward" | "tags" | "lastContact" | "flags"
  // Extended columns
  | "phone" | "email" | "address" | "city" | "postalCode" | "riding"
  | "gotvStatus" | "gotvScore" | "issues" | "notes" | "followUpDate"
  | "captain" | "signPlaced" | "superSupporter" | "partyMember" | "language"
  | "interactions" | "volunteer" | "dnc";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Name",
  contact: "Contact",
  support: "Support",
  ward: "Ward",
  tags: "Tags",
  lastContact: "Last Contact",
  flags: "Flags",
  phone: "Phone",
  email: "Email",
  address: "Address",
  city: "City",
  postalCode: "Postal Code",
  riding: "Riding",
  gotvStatus: "GOTV Status",
  gotvScore: "GOTV Score",
  issues: "Issues",
  notes: "Notes",
  followUpDate: "Follow-up Date",
  captain: "Captain",
  signPlaced: "Sign Placed",
  superSupporter: "Super Supporter",
  partyMember: "Party Member",
  language: "Language",
  interactions: "# Interactions",
  volunteer: "Volunteer",
  dnc: "Do Not Contact",
};

const COLUMN_CATEGORIES: Record<string, ColumnKey[]> = {
  "Identity": ["name", "phone", "email", "language"],
  "Location": ["address", "city", "postalCode", "ward", "riding"],
  "Canvassing": ["support", "gotvStatus", "gotvScore", "lastContact", "interactions", "issues", "notes"],
  "Engagement": ["tags", "flags", "volunteer", "signPlaced", "followUpDate", "captain"],
  "Flags": ["superSupporter", "partyMember", "dnc"],
};

const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["name", "contact", "support", "ward", "tags", "lastContact", "flags"];
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  name: 220, contact: 230, support: 170, ward: 130, tags: 220, lastContact: 150, flags: 150,
  phone: 140, email: 200, address: 220, city: 110, postalCode: 110, riding: 160,
  gotvStatus: 140, gotvScore: 110, issues: 200, notes: 240, followUpDate: 140,
  captain: 140, signPlaced: 110, superSupporter: 130, partyMember: 130, language: 110,
  interactions: 110, volunteer: 110, dnc: 110,
};

// GOTV score heuristic (0-100): supporter weight + recency of contact + commitment
function computeGotvScore(c: ContactRow): number {
  const supportPts =
    c.supportLevel === "strong_support" ? 50 :
    c.supportLevel === "leaning_support" ? 35 :
    c.supportLevel === "undecided" ? 15 : 0;
  const commitPts =
    c.gotvStatus === "voted" ? 30 :
    c.gotvStatus === "will_vote" ? 20 :
    c.gotvStatus === "not_checked" ? 0 : 5;
  const contactPts = c.lastContactedAt
    ? Math.max(0, 20 - Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24 * 7)) * 2)
    : 0;
  return Math.min(100, supportPts + commitPts + contactPts);
}

export default function ContactsClient({ campaignId, tags, userRole }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<ColumnKey | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [supportLevels, setSupportLevels] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState(false);
  const [volunteerOnly, setVolunteerOnly] = useState(false);
  const [signOnly, setSignOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wards, setWards] = useState<string[]>([]);

  // Filter presets
  interface FilterPreset { id: string; name: string; filters: Record<string, unknown>; isDefault: boolean; }
  const [presets, setPresets] = useState<{ builtin: FilterPreset[]; saved: FilterPreset[] }>({ builtin: [], saved: [] });
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    fetch(`/api/contacts/filter-presets?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => setPresets(d.data ?? { builtin: [], saved: [] }))
      .catch(() => { /* ignore */ });
  }, [campaignId]);

  const columnStorageKey = `poll-city-crm-columns-${campaignId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        order?: ColumnKey[];
        hidden?: ColumnKey[];
        widths?: Record<ColumnKey, number>;
      };
      if (parsed.order?.length) setColumnOrder(parsed.order);
      if (parsed.hidden) setHiddenColumns(parsed.hidden);
      if (parsed.widths) setColumnWidths((prev) => ({ ...prev, ...parsed.widths }));
    } catch {
      // ignore bad local storage data
    }
  }, [columnStorageKey]);

  useEffect(() => {
    async function loadServerPreferences() {
      try {
        const res = await fetch(`/api/contacts/column-preferences?campaignId=${campaignId}&tableKey=contacts`);
        if (!res.ok) return;
        const payload = await res.json();
        const pref = payload?.data;
        if (!pref) return;

        const serverOrder = Array.isArray(pref.order) ? pref.order as ColumnKey[] : null;
        const serverHidden = Array.isArray(pref.hidden) ? pref.hidden as ColumnKey[] : null;
        const serverWidths = (pref.widths && typeof pref.widths === "object") ? pref.widths as Record<ColumnKey, number> : null;

        if (serverOrder?.length) setColumnOrder(serverOrder);
        if (serverHidden) setHiddenColumns(serverHidden);
        if (serverWidths) setColumnWidths((prev) => ({ ...prev, ...serverWidths }));
      } catch {
        // keep local fallback
      }
    }

    loadServerPreferences();
  }, [campaignId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        columnStorageKey,
        JSON.stringify({ order: columnOrder, hidden: hiddenColumns, widths: columnWidths })
      );
    } catch {
      // ignore storage write failures
    }
  }, [columnOrder, hiddenColumns, columnWidths, columnStorageKey]);

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        await fetch("/api/contacts/column-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            tableKey: "contacts",
            order: columnOrder,
            hidden: hiddenColumns,
            widths: columnWidths,
          }),
        });
      } catch {
        // server sync is best-effort; local state remains source of truth
      }
    }, 350);

    return () => clearTimeout(id);
  }, [campaignId, columnOrder, hiddenColumns, columnWidths]);

  useEffect(() => {
    if (!resizing) return;
    const activeResize = resizing;

    function onMove(event: MouseEvent) {
      const delta = event.clientX - activeResize.startX;
      setColumnWidths((prev) => ({
        ...prev,
        [activeResize.key]: Math.max(90, activeResize.startWidth + delta),
      }));
    }

    function onUp() {
      setResizing(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  function applyPreset(preset: FilterPreset) {
    const f = preset.filters as {
      supportLevels?: string[]; tags?: string[]; wards?: string[];
      followUp?: boolean; volunteerInterest?: boolean; signRequested?: boolean;
      search?: string;
    };
    setSupportLevels(f.supportLevels ?? []);
    setSelectedTags(f.tags ?? []);
    setWards(f.wards ?? []);
    setFollowUp(f.followUp ?? false);
    setVolunteerOnly(f.volunteerInterest ?? false);
    setSignOnly(f.signRequested ?? false);
    setSearch(f.search ?? "");
    setShowPresetsMenu(false);
    toast.success(`Applied "${preset.name}"`);
  }

  async function saveCurrentFilters() {
    if (!presetName.trim()) { toast.error("Name required"); return; }
    try {
      const res = await fetch("/api/contacts/filter-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: presetName.trim(),
          filters: {
            supportLevels, tags: selectedTags, wards, followUp,
            volunteerInterest: volunteerOnly, signRequested: signOnly, search,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Filter saved");
      setShowSavePrompt(false);
      setPresetName("");
      // Refresh presets
      const r2 = await fetch(`/api/contacts/filter-presets?campaignId=${campaignId}`);
      const d2 = await r2.json();
      setPresets(d2.data ?? { builtin: [], saved: [] });
    } catch { toast.error("Save failed"); }
  }

  async function deletePreset(id: string) {
    if (!confirm("Delete this saved filter?")) return;
    try {
      const res = await fetch(`/api/contacts/filter-presets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      setPresets((p) => ({ ...p, saved: p.saved.filter((s) => s.id !== id) }));
    } catch { toast.error("Delete failed"); }
  }

  const debouncedSearch = useDebounce(search, 300);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (wards.length > 0) params.set("wards", wards.join(","));
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load contacts"); }
    finally { setLoading(false); }
  }, [campaignId, page, debouncedSearch, supportLevels, followUp, volunteerOnly, signOnly, selectedTags, wards]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => { setPage(1); }, [debouncedSearch, supportLevels, followUp, volunteerOnly, signOnly, selectedTags, wards]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [slideOverContactId, setSlideOverContactId] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    setSelectedContacts(checked ? contacts.map(c => c.id) : []);
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContacts(prev =>
      checked
        ? [...prev, contactId]
        : prev.filter(id => id !== contactId)
    );
  };

  const handleBulkTag = async (tagIds: string[]) => {
    try {
      await fetch("/api/contacts/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContacts, tagIds }),
      });
      toast.success("Tags updated");
      loadContacts();
      setSelectedContacts([]);
    } catch {
      toast.error("Failed to update tags");
    }
  };

  const handleBulkUpdateSupport = async (supportLevel: SupportLevel) => {
    try {
      await fetch("/api/contacts/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContacts, supportLevel }),
      });
      toast.success("Support levels updated");
      loadContacts();
      setSelectedContacts([]);
    } catch {
      toast.error("Failed to update support levels");
    }
  };

  const exportCSV = async () => {
    const url = `/api/import-export?campaignId=${campaignId}&type=contacts`;
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `contacts-${Date.now()}.csv`; a.click();
    toast.success("Export downloaded");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Contacts"
        description={`${total.toLocaleString()} total contacts`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-3.5 h-3.5" />Export</Button>
            <Link href="/import-export"><Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5" />Import</Button></Link>
            {["ADMIN", "CAMPAIGN_MANAGER"].includes(userRole) && (
              <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Contact</Button>
            )}
          </div>
        }
      />

      {/* Search + filters bar */}
      <Card className="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, address…"
              className="pl-9"
            />
            {loading && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" />}
          </div>
          <MultiSelect
            value={supportLevels}
            onChange={setSupportLevels}
            options={Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            placeholder="Support levels"
            className="w-44"
          />
          <MultiSelect
            value={selectedTags}
            onChange={setSelectedTags}
            options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
            placeholder="Tags"
            className="w-32"
          />
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" />More Filters{(followUp || volunteerOnly || signOnly || wards.length > 0) && <span className="ml-1 w-1.5 h-1.5 bg-white rounded-full inline-block" />}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowColumnManager((v) => !v)}>
              <SlidersHorizontal className="w-3.5 h-3.5" />Columns
            </Button>
            {showColumnManager && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowColumnManager(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-40 p-3 max-h-[70vh] overflow-y-auto">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Active columns</p>
                  <p className="text-[11px] text-gray-500 mb-2">Drag to reorder · Uncheck to hide</p>
                  <div className="space-y-1 mb-3">
                    {columnOrder.map((key) => {
                      const hidden = hiddenColumns.includes(key);
                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={() => setDraggingColumn(key)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (!draggingColumn || draggingColumn === key) return;
                            const from = columnOrder.indexOf(draggingColumn);
                            const to = columnOrder.indexOf(key);
                            if (from < 0 || to < 0) return;
                            const next = [...columnOrder];
                            const [moved] = next.splice(from, 1);
                            next.splice(to, 0, moved);
                            setColumnOrder(next);
                            setDraggingColumn(null);
                          }}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-2 py-1.5 cursor-grab active:cursor-grabbing hover:border-gray-200"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-800 truncate">{COLUMN_LABELS[key]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!hidden}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setHiddenColumns((prev) => prev.filter((x) => x !== key));
                                } else {
                                  setHiddenColumns((prev) => [...prev, key]);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setColumnOrder((prev) => prev.filter((k) => k !== key))}
                              className="text-gray-400 hover:text-red-600 text-xs font-bold w-5 h-5 rounded hover:bg-red-50"
                              aria-label={`Remove ${COLUMN_LABELS[key]}`}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add column picker, grouped by category */}
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">+ Add column</p>
                    {Object.entries(COLUMN_CATEGORIES).map(([cat, keys]) => {
                      const available = keys.filter((k) => !columnOrder.includes(k));
                      if (available.length === 0) return null;
                      return (
                        <div key={cat} className="mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{cat}</p>
                          <div className="flex flex-wrap gap-1">
                            {available.map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setColumnOrder((prev) => [...prev, key])}
                                className="text-[11px] px-2 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700"
                              >
                                + {COLUMN_LABELS[key]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setColumnOrder(DEFAULT_COLUMN_ORDER); setHiddenColumns([]); setColumnWidths(DEFAULT_COLUMN_WIDTHS); }}
                    className="mt-3 w-full h-8 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Reset to default
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Presets */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowPresetsMenu(!showPresetsMenu)}>
              <Bookmark className="w-3.5 h-3.5" /> Presets
            </Button>
            {showPresetsMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPresetsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 max-h-80 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 px-3 py-1.5">Built-in</p>
                  {presets.builtin.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-900 font-medium"
                    >
                      {p.name}
                    </button>
                  ))}
                  {presets.saved.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 px-3 py-1.5 border-t border-gray-100 mt-1">Saved</p>
                      {presets.saved.map((p) => (
                        <div key={p.id} className="flex items-center group hover:bg-gray-50">
                          <button onClick={() => applyPreset(p)} className="flex-1 text-left px-3 py-2 text-sm text-gray-900">
                            {p.name}
                          </button>
                          <button
                            onClick={() => deletePreset(p.id)}
                            aria-label="Delete preset"
                            className="p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => { setShowSavePrompt(true); setShowPresetsMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-semibold flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" /> Save current filters…
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Save preset prompt */}
        {showSavePrompt && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name (e.g. 'Downtown Supporters')"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveCurrentFilters(); }}
            />
            <Button size="sm" onClick={saveCurrentFilters}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowSavePrompt(false); setPresetName(""); }}>Cancel</Button>
          </div>
        )}
        {showFilters && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <Checkbox label="Follow-up needed" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            <Checkbox label="Volunteer interest" checked={volunteerOnly} onChange={(e) => setVolunteerOnly(e.target.checked)} />
            <Checkbox label="Sign requested" checked={signOnly} onChange={(e) => setSignOnly(e.target.checked)} />
            <MultiSelect
              value={wards}
              onChange={setWards}
              options={[
                { value: "Ward 1", label: "Ward 1" },
                { value: "Ward 2", label: "Ward 2" },
                // Add more wards as needed
              ]}
              placeholder="Wards"
              className="w-32"
            />
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Select onChange={(e) => e.target.value && handleBulkUpdateSupport(e.target.value as SupportLevel)}>
                <option value="">Update support level</option>
                {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
              <MultiSelect
                value={[]}
                onChange={handleBulkTag}
                options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
                placeholder="Add tags"
              />
              <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="max-h-[65vh] overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                {columnOrder.filter((k) => !hiddenColumns.includes(k)).map((key) => (
                  <th
                    key={key}
                    draggable
                    onDragStart={() => setDraggingColumn(key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!draggingColumn || draggingColumn === key) return;
                      const from = columnOrder.indexOf(draggingColumn);
                      const to = columnOrder.indexOf(key);
                      if (from < 0 || to < 0) return;
                      const next = [...columnOrder];
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      setColumnOrder(next);
                      setDraggingColumn(null);
                    }}
                    className="text-left px-4 py-3 font-medium text-gray-600 relative select-none"
                    style={{ width: columnWidths[key], minWidth: columnWidths[key] }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3 text-gray-300" />
                      <span>{COLUMN_LABELS[key]}</span>
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing({ key, startX: e.clientX, startWidth: columnWidths[key] ?? 120 });
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    {Array.from({ length: columnOrder.filter((k) => !hiddenColumns.includes(k)).length }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr><td colSpan={columnOrder.filter((k) => !hiddenColumns.includes(k)).length + 1} className="py-16 text-center text-gray-400 text-sm">No contacts found</td></tr>
              ) : contacts.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedContacts.includes(c.id)}
                      onChange={(e) => handleSelectContact(c.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  {columnOrder.filter((k) => !hiddenColumns.includes(k)).map((key) => (
                    <td key={key} className="px-4 py-3" style={{ width: columnWidths[key], minWidth: columnWidths[key] }}>
                      {key === "name" && (
                        <>
                          <div className="font-medium text-gray-900">{fullName(c.firstName, c.lastName)}</div>
                          {c._count.interactions > 0 && <div className="text-xs text-gray-400">{c._count.interactions} interaction{c._count.interactions !== 1 ? "s" : ""}</div>}
                        </>
                      )}
                      {key === "contact" && (
                        <div className="space-y-0.5">
                          {c.phone && <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</div>}
                          {c.email && <div className="flex items-center gap-1 text-gray-500 text-xs truncate max-w-[160px]"><Mail className="w-3 h-3" />{c.email}</div>}
                        </div>
                      )}
                      {key === "support" && (
                        <Select
                          value={c.supportLevel}
                          onChange={async (e) => {
                            try {
                              await fetch(`/api/contacts/${c.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ supportLevel: e.target.value }),
                              });
                              loadContacts();
                            } catch {
                              toast.error("Failed to update support level");
                            }
                          }}
                          className="w-32"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </Select>
                      )}
                      {key === "ward" && <span className="text-gray-500">{c.ward ?? "—"}</span>}
                      {key === "tags" && (
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.slice(0, 2).map(({ tag }) => (
                            <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                          ))}
                          {c.tags.length > 2 && <span className="text-xs text-gray-400">+{c.tags.length - 2}</span>}
                        </div>
                      )}
                      {key === "lastContact" && <span className="text-gray-500">{formatDate(c.lastContactedAt)}</span>}
                      {key === "flags" && (
                        <div className="flex gap-1">
                          {c.followUpNeeded && <span className="w-2 h-2 bg-amber-500 rounded-full" title="Follow-up needed" />}
                          {c.volunteerInterest && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Volunteer interest" />}
                          {c.signRequested && <span className="w-2 h-2 bg-orange-500 rounded-full" title="Sign requested" />}
                        </div>
                      )}
                      {key === "phone" && <span className="text-gray-600 text-xs">{c.phone ? formatPhone(c.phone) : "—"}</span>}
                      {key === "email" && <span className="text-gray-500 text-xs truncate block max-w-[180px]">{c.email ?? "—"}</span>}
                      {key === "address" && <span className="text-gray-600 text-xs truncate block max-w-[200px]">{c.address1 ?? "—"}</span>}
                      {key === "city" && <span className="text-gray-500 text-xs">{c.city ?? "—"}</span>}
                      {key === "postalCode" && <span className="text-gray-500 text-xs font-mono">{c.postalCode ?? "—"}</span>}
                      {key === "riding" && <span className="text-gray-500 text-xs truncate block max-w-[140px]">{c.riding ?? "—"}</span>}
                      {key === "gotvStatus" && (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          c.gotvStatus === "voted" && "bg-emerald-100 text-emerald-800",
                          c.gotvStatus === "will_vote" && "bg-blue-100 text-blue-800",
                          c.gotvStatus === "refused" && "bg-red-100 text-red-800",
                          c.gotvStatus === "not_home" && "bg-amber-100 text-amber-800",
                          (!c.gotvStatus || c.gotvStatus === "not_checked") && "bg-gray-100 text-gray-600"
                        )}>{c.gotvStatus?.replace("_", " ") ?? "not checked"}</span>
                      )}
                      {key === "gotvScore" && (() => {
                        const score = computeGotvScore(c);
                        const tone = score >= 70 ? "text-emerald-700 bg-emerald-50" : score >= 40 ? "text-amber-700 bg-amber-50" : "text-gray-600 bg-gray-100";
                        return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums", tone)}>{score}</span>;
                      })()}
                      {key === "issues" && (
                        <div className="flex gap-1 flex-wrap">
                          {(c.issues ?? []).slice(0, 2).map((i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{i}</span>
                          ))}
                          {(c.issues ?? []).length > 2 && <span className="text-[10px] text-gray-400">+{(c.issues ?? []).length - 2}</span>}
                        </div>
                      )}
                      {key === "notes" && <span className="text-gray-500 text-xs truncate block max-w-[220px]">{c.notes ?? "—"}</span>}
                      {key === "followUpDate" && <span className="text-gray-500 text-xs">{formatDate(c.followUpDate)}</span>}
                      {key === "captain" && <span className="text-gray-500 text-xs">{c.captain ?? "—"}</span>}
                      {key === "signPlaced" && <span className="text-xs">{c.signPlaced ? "✓" : "—"}</span>}
                      {key === "superSupporter" && <span className="text-xs">{c.superSupporter ? "★" : "—"}</span>}
                      {key === "partyMember" && <span className="text-xs">{c.partyMember ? "✓" : "—"}</span>}
                      {key === "language" && <span className="text-gray-500 text-xs uppercase">{c.preferredLanguage ?? "en"}</span>}
                      {key === "interactions" && <span className="text-gray-600 text-xs tabular-nums">{c._count.interactions}</span>}
                      {key === "volunteer" && <span className="text-xs">{c.volunteerInterest ? "✓" : "—"}</span>}
                      {key === "dnc" && <span className="text-xs">{c.doNotContact ? <span className="text-red-700 font-bold">DNC</span> : "—"}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Contact Modal */}
      <AddContactModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        campaignId={campaignId}
        onCreated={() => { setShowAdd(false); loadContacts(); }}
      />
    </div>
  );
}

function AddContactModal({ open, onClose, campaignId, onCreated }: { open: boolean; onClose: () => void; campaignId: string; onCreated: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { campaignId, supportLevel: SupportLevel.unknown, preferredLanguage: "en", issues: [] },
  });

  async function onSubmit(data: CreateContactInput) {
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast.success("Contact added"); reset(); onCreated(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed to add contact"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Contact" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" error={errors.firstName?.message} required>
            <Input {...register("firstName")} placeholder="Jane" />
          </FormField>
          <FormField label="Last Name" error={errors.lastName?.message} required>
            <Input {...register("lastName")} placeholder="Smith" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="416-555-0100" type="tel" />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input {...register("email")} placeholder="jane@email.com" type="email" />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Street #" required>
            <Input {...register("streetNumber")} placeholder="302" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Street Name">
              <Input {...register("address1")} placeholder="Maple Avenue" />
            </FormField>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="City"><Input {...register("city")} placeholder="Toronto" /></FormField>
          <FormField label="Province"><Input {...register("province")} placeholder="ON" /></FormField>
          <FormField label="Postal Code"><Input {...register("postalCode")} placeholder="M4C 1A1" /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ward"><Input {...register("ward")} placeholder="Ward 12" /></FormField>
          <FormField label="Support Level">
            <Select {...register("supportLevel")}>
              {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Notes"><Textarea {...register("notes")} placeholder="Any notes about this contact…" rows={3} /></FormField>
        <div className="flex gap-3">
          <Checkbox label="Follow-up needed" {...register("followUpNeeded")} />
          <Checkbox label="Sign requested" {...register("signRequested")} />
          <Checkbox label="Volunteer interest" {...register("volunteerInterest")} />
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Add Contact</Button>
        </div>
      </form>
    </Modal>
  );
}
