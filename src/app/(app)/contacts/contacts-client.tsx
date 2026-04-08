"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Download, Upload, Filter, Phone, Mail, ChevronLeft, ChevronRight, CheckSquare, Bookmark, Save, Trash2, GripVertical, SlidersHorizontal, Route, Send, MessageSquare, ListChecks, X, Users, CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Card, PageHeader, SupportLevelBadge, Modal, FormField, Textarea, Checkbox, MultiSelect, Spinner } from "@/components/ui";
import { AdoniPageAssist } from "@/components/adoni/adoni-page-assist";
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
  | "issues" | "notes" | "followUpDate"
  | "captain" | "signPlaced" | "superSupporter" | "partyMember" | "language"
  | "interactions" | "volunteer" | "dnc";

type SortDirection = "asc" | "desc";
type SortSpec = { key: ColumnKey; direction: SortDirection };

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
  "CRM": ["support", "lastContact", "interactions", "issues", "notes"],
  "Engagement": ["tags", "flags", "volunteer", "signPlaced", "followUpDate", "captain"],
  "Flags": ["superSupporter", "partyMember", "dnc"],
};

const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["name", "contact", "support", "ward", "tags", "lastContact", "flags"];
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  name: 220, contact: 230, support: 170, ward: 130, tags: 220, lastContact: 150, flags: 150,
  phone: 140, email: 200, address: 220, city: 110, postalCode: 110, riding: 160,
  issues: 200, notes: 240, followUpDate: 140,
  captain: 140, signPlaced: 110, superSupporter: 130, partyMember: 130, language: 110,
  interactions: 110, volunteer: 110, dnc: 110,
};


export default function ContactsClient({ campaignId, tags, userRole }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<ColumnKey | null>(null);
  const [sorts, setSorts] = useState<SortSpec[]>([{ key: "name", direction: "asc" }]);

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
  const sortableColumns: ColumnKey[] = [
    "name", "phone", "email", "support", "ward", "lastContact", "city", "postalCode", "riding",
    "followUpDate", "interactions", "volunteer", "dnc",
  ];

  function encodeSorts(input: SortSpec[]) {
    return input.map((s) => `${s.key}:${s.direction}`).join(",");
  }

  function cycleDirection(current: SortDirection | null): SortDirection | null {
    if (current === null) return "asc";
    if (current === "asc") return "desc";
    return null;
  }

  function sortIndicator(key: ColumnKey) {
    const idx = sorts.findIndex((s) => s.key === key);
    if (idx === -1) return null;
    const active = sorts[idx];
    const arrow = active.direction === "asc" ? "^" : "v";
    return `${arrow}${sorts.length > 1 ? ` ${idx + 1}` : ""}`;
  }

  function handleHeaderSortClick(key: ColumnKey, isShift: boolean) {
    if (!sortableColumns.includes(key)) return;

    const existing = sorts.find((s) => s.key === key);
    const nextDirection = cycleDirection(existing?.direction ?? null);

    if (isShift) {
      setSorts((prev) => {
        const without = prev.filter((s) => s.key !== key);
        if (!nextDirection) return without.length > 0 ? without : [{ key: "name", direction: "asc" }];
        return [...without, { key, direction: nextDirection }];
      });
      setPage(1);
      return;
    }

    if (!nextDirection) {
      setSorts([{ key: "name", direction: "asc" }]);
      setPage(1);
      return;
    }

    setSorts([{ key, direction: nextDirection }]);
    setPage(1);
  }

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
    setLoadError(null);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      params.set("sort", encodeSorts(sorts));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (wards.length > 0) params.set("wards", wards.join(","));
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to load contacts");
      }
      const data = await res.json();
      setContacts(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load contacts";
      setLoadError(message);
      toast.error(message);
    }
    finally { setLoading(false); }
  }, [campaignId, page, debouncedSearch, supportLevels, followUp, volunteerOnly, signOnly, selectedTags, wards, sorts]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => { setPage(1); }, [debouncedSearch, supportLevels, followUp, volunteerOnly, signOnly, selectedTags, wards]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = Boolean(
    debouncedSearch ||
    supportLevels.length ||
    selectedTags.length ||
    wards.length ||
    followUp ||
    volunteerOnly ||
    signOnly
  );

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [bulkActionModal, setBulkActionModal] = useState<"support" | "delete" | null>(null);
  const [slideOverContactId, setSlideOverContactId] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // ── Inline cell editing ──────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  function startEdit(id: string, field: string) {
    setEditingCell({ id, field });
  }

  async function saveCell(id: string, field: string, value: string) {
    setEditingCell(null);
    const prev = contacts.find((c) => c.id === id);
    if (!prev) return;

    // Optimistic update
    setContacts((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, [field]: value || null } : c
      )
    );

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved", { duration: 1500, position: "bottom-right" });
    } catch {
      // Revert on error
      setContacts((cs) => cs.map((c) => (c.id === id ? prev : c)));
      toast.error("Failed to save");
    }
  }

  async function saveCellName(id: string, firstName: string, lastName: string) {
    setEditingCell(null);
    const prev = contacts.find((c) => c.id === id);
    if (!prev) return;

    setContacts((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, firstName: firstName || prev.firstName, lastName: lastName || prev.lastName } : c
      )
    );

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName || prev.firstName, lastName: lastName || prev.lastName }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved", { duration: 1500, position: "bottom-right" });
    } catch {
      setContacts((cs) => cs.map((c) => (c.id === id ? prev : c)));
      toast.error("Failed to save");
    }
  }
  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignSelf, setTaskAssignSelf] = useState(true);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectedContacts(checked ? contacts.map(c => c.id) : []);
    if (!checked) setSelectAllPages(false);
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContacts(prev =>
      checked
        ? [...prev, contactId]
        : prev.filter(id => id !== contactId)
    );
  };

  const handleBulkTag = async (tagIds: string[]) => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/contacts/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContacts, tagIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update tags");
      }
      toast.success("Tags updated");
      loadContacts();
      setSelectedContacts([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tags");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkUpdateSupport = async (supportLevel: SupportLevel) => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/contacts/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContacts, supportLevel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update support levels");
      }
      toast.success("Support levels updated");
      loadContacts();
      setSelectedContacts([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update support levels");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkMarkContacted = async () => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedContacts,
          campaignId,
          operation: "update",
          update: { lastContactedAt: new Date().toISOString() },
        }),
      });
      if (!res.ok) throw new Error("Failed to mark contacted");
      toast.success(`${selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""} marked as contacted`);
      setSelectedContacts([]);
      setSelectAllPages(false);
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedContacts,
          campaignId,
          operation: "delete",
          ...(selectAllPages && {
            selectAll: true,
            filters: {
              search: debouncedSearch,
              supportLevels,
              followUpNeeded: followUp,
              volunteerInterest: volunteerOnly,
              signRequested: signOnly,
              tags: selectedTags,
              wards,
            },
          }),
        }),
      });
      if (!res.ok) throw new Error("Failed to delete contacts");
      toast.success(`${selectAllPages ? "All matching" : selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""} moved to Recycle Bin`);
      setSelectedContacts([]);
      setSelectAllPages(false);
      setBulkActionModal(null);
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkSupportChange = async (supportLevel: string) => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedContacts,
          campaignId,
          operation: "update",
          update: { supportLevel },
          ...(selectAllPages && {
            selectAll: true,
            filters: {
              search: debouncedSearch,
              supportLevels,
              followUpNeeded: followUp,
              volunteerInterest: volunteerOnly,
              signRequested: signOnly,
              tags: selectedTags,
              wards,
            },
          }),
        }),
      });
      if (!res.ok) throw new Error("Failed to update support level");
      toast.success(`Updated support level for ${selectAllPages ? "all matching" : selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""}`);
      setSelectedContacts([]);
      setSelectAllPages(false);
      setBulkActionModal(null);
      loadContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const exportCSV = async () => {
    try {
      const url = `/api/import-export?campaignId=${campaignId}&type=contacts`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `contacts-${Date.now()}.csv`;
      a.click();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  // --- Enterprise action bar handlers ---

  const handleCreateWalkList = async () => {
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/canvass/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactIds: selectedContacts }),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; id?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to create walk list");
      toast.success("Walk list created");
      if (data.url) window.open(data.url, "_blank");
      else if (data.id) window.open(`/canvass/${data.id}`, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create walk list");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSendEmail = () => {
    const ids = selectedContacts.join(",");
    router.push(`/communications/email?contactIds=${encodeURIComponent(ids)}&campaignId=${campaignId}`);
  };

  const handleSendSMS = () => {
    const ids = selectedContacts.join(",");
    router.push(`/communications/sms?contactIds=${encodeURIComponent(ids)}&campaignId=${campaignId}`);
  };

  const handleCreateTasks = async () => {
    if (!taskTitle.trim()) { toast.error("Task title required"); return; }
    setTaskSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedContacts.map((contactId) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId, title: taskTitle.trim(), contactId }),
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      toast.success(`${succeeded} task${succeeded !== 1 ? "s" : ""} created`);
      setShowTaskModal(false);
      setTaskTitle("");
    } catch {
      toast.error("Failed to create tasks");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleCallListSelected = async () => {
    try {
      const ids = selectedContacts.join(",");
      const url = `/api/export/contacts?campaignId=${campaignId}&ids=${encodeURIComponent(ids)}&format=call`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `call-list-${Date.now()}.csv`;
      a.click();
      toast.success("Call list downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleCallListFiltered = async () => {
    try {
      const params = new URLSearchParams({ campaignId, format: "call" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (wards.length > 0) params.set("wards", wards.join(","));
      const url = `/api/export/contacts?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `call-list-filtered-${Date.now()}.csv`;
      a.click();
      toast.success("Call list downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleExportSelected = async () => {
    try {
      const ids = selectedContacts.join(",");
      const url = `/api/export/contacts?campaignId=${campaignId}&ids=${encodeURIComponent(ids)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `contacts-selected-${Date.now()}.csv`;
      a.click();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleExportFiltered = async () => {
    try {
      const params = new URLSearchParams({ campaignId });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (wards.length > 0) params.set("wards", wards.join(","));
      const url = `/api/export/contacts?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `contacts-filtered-${Date.now()}.csv`;
      a.click();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleWalkListFromFilter = async () => {
    setBulkSubmitting(true);
    try {
      const params = new URLSearchParams({ campaignId, pageSize: "9999" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (wards.length > 0) params.set("wards", wards.join(","));
      const listRes = await fetch(`/api/contacts?${params.toString()}`);
      const listData = await listRes.json() as { data?: { id: string }[] };
      const ids = (listData.data ?? []).map((c) => c.id);
      if (ids.length === 0) { toast.error("No contacts match current filters"); return; }
      const res = await fetch("/api/canvass/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactIds: ids }),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create walk list");
      toast.success(`Walk list created (${ids.length} contacts)`);
      if (data.url) window.open(data.url, "_blank");
      else if (data.id) window.open(`/canvass/${data.id}`, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create walk list");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleEmailFiltered = () => {
    const params = new URLSearchParams({ campaignId });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (supportLevels.length > 0) params.set("supportLevels", supportLevels.join(","));
    if (followUp) params.set("followUpNeeded", "true");
    if (volunteerOnly) params.set("volunteerInterest", "true");
    if (signOnly) params.set("signRequested", "true");
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (wards.length > 0) params.set("wards", wards.join(","));
    router.push(`/communications/email?${params.toString()}`);
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

      <AdoniPageAssist
        pageKey="contacts"
        prompts={[
          "Who are my strongest supporters not yet contacted?",
          "Find all volunteers with no follow-up scheduled",
          "Create a walk list for strong supporters in ward 3",
          "Which contacts requested a sign but haven't been visited?",
        ]}
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
            <span className="text-xs text-gray-500">Tip: Shift+click headers for multi-sort</span>
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

      {loadError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-900">Unable to load contacts</p>
              <p className="text-xs text-red-700 mt-0.5">{loadError}</p>
            </div>
            <Button size="sm" variant="outline" onClick={loadContacts}>Retry</Button>
          </div>
        </Card>
      )}

      {/* Enterprise Action Bar */}
      <AnimatePresence>
        {(selectedContacts.length > 0 || hasActiveFilters) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {selectedContacts.length > 0 ? (
              /* ---- Selection mode ---- */
              <Card className="p-3 bg-blue-50/60 border-blue-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-1">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedContacts.length} selected
                    </span>
                  </div>
                  {/* Existing bulk actions */}
                  <Select
                    onChange={(e) => e.target.value && handleBulkUpdateSupport(e.target.value as SupportLevel)}
                    disabled={bulkSubmitting}
                    className="h-8 text-xs"
                  >
                    <option value="">Update support…</option>
                    {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </Select>
                  <MultiSelect
                    value={[]}
                    onChange={handleBulkTag}
                    options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
                    placeholder="Add tags"
                    disabled={bulkSubmitting}
                  />
                  <div className="w-px h-6 bg-blue-200 mx-1" />
                  {/* New enterprise actions */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateWalkList}
                    disabled={bulkSubmitting}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <Route className="w-3.5 h-3.5" />
                    Walk List
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallListSelected}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call List
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendEmail}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendSMS}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    SMS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTaskModal(true)}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    Create Tasks
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportSelected}
                    className="border-blue-300 hover:bg-blue-100 text-blue-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedContacts([])}
                    disabled={bulkSubmitting}
                    className="ml-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </Button>
                </div>
              </Card>
            ) : (
              /* ---- Filter-only mode ---- */
              <Card className="p-3 bg-slate-50 border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-1">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {total.toLocaleString()} contacts match this filter
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-300 mx-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportFiltered}
                    className="text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Filtered
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWalkListFromFilter}
                    disabled={bulkSubmitting}
                    className="text-slate-700"
                  >
                    <Route className="w-3.5 h-3.5" />
                    Walk List from Filter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEmailFiltered}
                    className="text-slate-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Email This List
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallListFiltered}
                    className="text-slate-700"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call List
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline task creation modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-gray-900">Create Tasks</p>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-lg p-1.5 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Creates one task per selected contact ({selectedContacts.length} total)
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task title</label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Follow up with contact…"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") void handleCreateTasks(); }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskAssignSelf}
                    onChange={(e) => setTaskAssignSelf(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Assign to me
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void handleCreateTasks()}
                  loading={taskSubmitting}
                  disabled={!taskTitle.trim() || taskSubmitting}
                >
                  Create Tasks
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile card view (below md) */}
      <div className="md:hidden space-y-2">
        {loading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`mobile-skeleton-${i}`} className="bg-white rounded-xl border border-slate-200 p-3.5">
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            </div>
          ))
        )}
        {!loading && contacts.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm font-semibold text-slate-900">No contacts found</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasActiveFilters ? "Try clearing filters or search terms." : "Contacts are the people in your campaign universe — voters, volunteers, and supporters. Import a list or add your first contact to get started."}
            </p>
            {!hasActiveFilters && (
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/import-export"><Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5" />Import Contacts</Button></Link>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Contact</Button>
              </div>
            )}
          </Card>
        )}
        {contacts.map((c) => {
          const supportColor =
            c.supportLevel === "strong_support" ? "border-l-emerald-500" :
            c.supportLevel === "leaning_support" ? "border-l-emerald-300" :
            c.supportLevel === "undecided" ? "border-l-amber-400" :
            c.supportLevel === "leaning_opposition" ? "border-l-orange-400" :
            c.supportLevel === "strong_opposition" ? "border-l-red-500" : "border-l-slate-300";
          return (
            <div
              key={c.id}
              onClick={() => setSlideOverContactId(c.id)}
              className={`bg-white rounded-xl border border-slate-200 border-l-4 ${supportColor} p-3.5 active:bg-slate-50 cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{fullName(c.firstName, c.lastName)}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {c.phone ? formatPhone(c.phone) : c.email ?? "No contact info"}
                  </p>
                </div>
                <SupportLevelBadge level={c.supportLevel} />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                {c.ward && <span>{c.ward}</span>}
                {c._count.interactions > 0 && <span>{c._count.interactions} interaction{c._count.interactions !== 1 ? "s" : ""}</span>}
                {c.followUpNeeded && <span className="text-amber-600 font-semibold">Follow-up</span>}
                {c.volunteerInterest && <span className="text-blue-600 font-semibold">Volunteer</span>}
              </div>
              {c.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {c.tags.slice(0, 3).map(({ tag }) => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                  ))}
                  {c.tags.length > 3 && <span className="text-[10px] text-slate-400">+{c.tags.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Select-all pages banner */}
      {selectedContacts.length === contacts.length && contacts.length === pageSize && !selectAllPages && (
        <div className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="text-blue-800">All {contacts.length} contacts on this page are selected.</span>
          <button
            type="button"
            onClick={() => setSelectAllPages(true)}
            className="font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            Select all {total.toLocaleString()} contacts?
          </button>
        </div>
      )}
      {selectAllPages && (
        <div className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm">
          <span className="text-white font-medium">All {total.toLocaleString()} contacts are selected.</span>
          <button
            type="button"
            onClick={() => { setSelectAllPages(false); setSelectedContacts([]); }}
            className="font-semibold text-blue-200 hover:text-white underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Desktop table (md and above) */}
      <Card className="overflow-hidden hidden md:block">
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
                    <div
                      className={`flex items-center gap-2 ${sortableColumns.includes(key) ? "cursor-pointer" : ""}`}
                      onClick={(e) => handleHeaderSortClick(key, e.shiftKey)}
                      title={sortableColumns.includes(key) ? "Click to sort. Shift+click to add secondary sort." : undefined}
                    >
                      <GripVertical className="w-3 h-3 text-gray-300" />
                      <span>{COLUMN_LABELS[key]}</span>
                      {sortIndicator(key) && <span className="text-[10px] font-semibold text-blue-600">{sortIndicator(key)}</span>}
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
                <tr>
                  <td colSpan={columnOrder.filter((k) => !hiddenColumns.includes(k)).length + 1} className="py-16 text-center text-gray-400 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-700">No contacts found</p>
                      <p className="text-xs text-gray-500">
                        {hasActiveFilters ? "Try clearing filters or search terms." : "Contacts are the people in your campaign universe. Import a list or add your first contact to begin."}
                      </p>
                      {!hasActiveFilters && (
                        <div className="mt-3 flex justify-center gap-2">
                          <Link href="/import-export"><Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5" />Import Contacts</Button></Link>
                          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Contact</Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : contacts.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-blue-50/40 transition-colors"
                  draggable
                  onDragStart={(event) => {
                    const payload = JSON.stringify({
                      type: "contact",
                      id: c.id,
                      name: fullName(c.firstName, c.lastName),
                      phone: c.phone,
                      supportLevel: c.supportLevel,
                    });
                    event.dataTransfer.setData("application/json", payload);
                    event.dataTransfer.setData("text/plain", `Contact ${fullName(c.firstName, c.lastName)} (${c.supportLevel})`);
                  }}
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
                        editingCell?.id === c.id && editingCell.field === "name" ? (
                          <div className="flex gap-1">
                            <input
                              ref={firstNameRef}
                              autoFocus
                              placeholder="First"
                              defaultValue={c.firstName}
                              onKeyDown={(e) => {
                                if (e.key === "Tab") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.focus(); }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-24 px-1.5 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              data-first-name
                            />
                            <input
                              placeholder="Last"
                              defaultValue={c.lastName}
                              onBlur={(e) => {
                                const firstName = (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value ?? c.firstName;
                                void saveCellName(c.id, firstName, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const firstName = (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value ?? c.firstName;
                                  void saveCellName(c.id, firstName, e.currentTarget.value);
                                }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-28 px-1.5 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div onClick={() => startEdit(c.id, "name")}>
                            <div className="font-medium text-gray-900 cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all inline-block">{fullName(c.firstName, c.lastName)}</div>
                            {c._count.interactions > 0 && <div className="text-xs text-gray-400 mt-0.5">{c._count.interactions} interaction{c._count.interactions !== 1 ? "s" : ""}</div>}
                          </div>
                        )
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
                      {key === "ward" && (
                        editingCell?.id === c.id && editingCell.field === "ward" ? (
                          <input
                            autoFocus
                            defaultValue={c.ward ?? ""}
                            onBlur={(e) => void saveCell(c.id, "ward", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveCell(c.id, "ward", e.currentTarget.value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(c.id, "ward")}
                            className="text-gray-500 text-sm cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all inline-block"
                          >
                            {c.ward ?? <span className="text-gray-300">—</span>}
                          </span>
                        )
                      )}
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
                      {key === "phone" && (
                        editingCell?.id === c.id && editingCell.field === "phone" ? (
                          <input
                            autoFocus
                            type="tel"
                            defaultValue={c.phone ?? ""}
                            onBlur={(e) => void saveCell(c.id, "phone", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveCell(c.id, "phone", e.currentTarget.value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(c.id, "phone")}
                            className="text-gray-600 text-xs cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all inline-block"
                          >
                            {c.phone ? formatPhone(c.phone) : <span className="text-gray-300">—</span>}
                          </span>
                        )
                      )}
                      {key === "email" && (
                        editingCell?.id === c.id && editingCell.field === "email" ? (
                          <input
                            autoFocus
                            type="email"
                            defaultValue={c.email ?? ""}
                            onBlur={(e) => void saveCell(c.id, "email", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveCell(c.id, "email", e.currentTarget.value);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(c.id, "email")}
                            className="text-gray-500 text-xs truncate block max-w-[180px] cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all"
                          >
                            {c.email ?? <span className="text-gray-300">—</span>}
                          </span>
                        )
                      )}
                      {key === "address" && <span className="text-gray-600 text-xs truncate block max-w-[200px]">{c.address1 ?? "—"}</span>}
                      {key === "city" && <span className="text-gray-500 text-xs">{c.city ?? "—"}</span>}
                      {key === "postalCode" && <span className="text-gray-500 text-xs font-mono">{c.postalCode ?? "—"}</span>}
                      {key === "riding" && <span className="text-gray-500 text-xs truncate block max-w-[140px]">{c.riding ?? "—"}</span>}
                      {key === "issues" && (
                        <div className="flex gap-1 flex-wrap">
                          {(c.issues ?? []).slice(0, 2).map((i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{i}</span>
                          ))}
                          {(c.issues ?? []).length > 2 && <span className="text-[10px] text-gray-400">+{(c.issues ?? []).length - 2}</span>}
                        </div>
                      )}
                      {key === "notes" && (
                        editingCell?.id === c.id && editingCell.field === "notes" ? (
                          <textarea
                            autoFocus
                            rows={2}
                            defaultValue={c.notes ?? ""}
                            onBlur={(e) => void saveCell(c.id, "notes", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingCell(null);
                              if (e.key === "Enter" && e.metaKey) void saveCell(c.id, "notes", e.currentTarget.value);
                            }}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(c.id, "notes")}
                            className="text-gray-500 text-xs truncate block max-w-[220px] cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all"
                          >
                            {c.notes ?? <span className="text-gray-300">—</span>}
                          </span>
                        )
                      )}
                      {key === "followUpDate" && (
                        editingCell?.id === c.id && editingCell.field === "followUpDate" ? (
                          <input
                            autoFocus
                            type="date"
                            defaultValue={c.followUpDate ? c.followUpDate.slice(0, 10) : ""}
                            onBlur={(e) => {
                              const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                              void saveCell(c.id, "followUpDate", val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = e.currentTarget.value ? new Date(e.currentTarget.value).toISOString() : "";
                                void saveCell(c.id, "followUpDate", val);
                              }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(c.id, "followUpDate")}
                            className="text-gray-500 text-xs cursor-text hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all inline-block"
                          >
                            {c.followUpDate ? formatDate(c.followUpDate) : <span className="text-gray-300">—</span>}
                          </span>
                        )
                      )}
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

      {/* ── Sticky bottom bulk action bar ─────────────────────────────── */}
      <AnimatePresence>
        {selectedContacts.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A2342] border-t border-slate-700 px-4 py-3 flex items-center gap-3 shadow-2xl md:left-60"
          >
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              {selectAllPages ? `All ${total.toLocaleString()} selected` : `${selectedContacts.length} contact${selectedContacts.length !== 1 ? "s" : ""} selected`}
            </span>
            <div className="flex-1 flex flex-wrap gap-2">
              <BulkActionButton icon={Users} label="Change Support" onClick={() => setBulkActionModal("support")} />
              <BulkActionButton icon={Send} label="Send Email" onClick={handleSendEmail} />
              <BulkActionButton icon={MessageSquare} label="Send SMS" onClick={handleSendSMS} />
              <BulkActionButton icon={CheckCircle2} label="Mark Contacted" onClick={() => void handleBulkMarkContacted()} disabled={bulkSubmitting} />
              <BulkActionButton icon={Trash2} label="Delete" onClick={() => setBulkActionModal("delete")} danger />
            </div>
            <button
              onClick={() => { setSelectedContacts([]); setSelectAllPages(false); }}
              className="text-slate-400 hover:text-white ml-auto flex-shrink-0"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Change Support modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {bulkActionModal === "support" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setBulkActionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-gray-900">Change Support Level</p>
                <button onClick={() => setBulkActionModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Update {selectAllPages ? `all ${total.toLocaleString()} matching` : selectedContacts.length} contact{selectedContacts.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {(["strong_support", "leaning_support", "unknown", "leaning_opposition", "strong_opposition"] as const).map((level) => {
                  const colors: Record<string, string> = {
                    strong_support: "bg-emerald-600 hover:bg-emerald-700 text-white",
                    leaning_support: "bg-emerald-400 hover:bg-emerald-500 text-white",
                    unknown: "bg-amber-400 hover:bg-amber-500 text-white",
                    leaning_opposition: "bg-orange-500 hover:bg-orange-600 text-white",
                    strong_opposition: "bg-red-600 hover:bg-red-700 text-white",
                  };
                  return (
                    <button
                      key={level}
                      onClick={() => void handleBulkSupportChange(level)}
                      disabled={bulkSubmitting}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${colors[level]}`}
                    >
                      {SUPPORT_LEVEL_LABELS[level]}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full mt-3" onClick={() => setBulkActionModal(null)}>Cancel</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ─────────────────────────────────── */}
      <AnimatePresence>
        {bulkActionModal === "delete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setBulkActionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-gray-900">Delete Contacts</p>
                <button onClick={() => setBulkActionModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Delete {selectAllPages ? `all ${total.toLocaleString()} matching` : <strong>{selectedContacts.length}</strong>} contact{selectedContacts.length !== 1 ? "s" : ""}? They will be moved to the Recycle Bin and can be restored within 90 days.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setBulkActionModal(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleBulkDelete()}
                  loading={bulkSubmitting}
                  disabled={bulkSubmitting}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Bulk action button ───────────────────────────────────────────────────────
function BulkActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        danger
          ? "bg-red-600/20 text-red-300 hover:bg-red-600/40 border border-red-600/40"
          : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
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
