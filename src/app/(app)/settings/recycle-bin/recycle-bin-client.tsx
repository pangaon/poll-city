"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, RotateCcw, CheckCircle2, Search, AlertTriangle } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Badge, EmptyState } from "@/components/ui";
import { toast } from "sonner";
import { SupportLevel } from "@prisma/client";

interface DeletedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  supportLevel: SupportLevel;
  ward: string | null;
  deletedAt: string;
}

interface Props {
  campaignId: string;
  isAdmin: boolean;
}

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: "bg-green-100 text-green-800",
  lean_support: "bg-teal-100 text-teal-800",
  undecided: "bg-yellow-100 text-yellow-800",
  lean_oppose: "bg-orange-100 text-orange-800",
  strong_oppose: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default function RecycleBinClient({ campaignId, isAdmin }: Props) {
  const [contacts, setContacts] = useState<DeletedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<Set<string>>(new Set());
  const [permanentlyDeleting, setPermanentlyDeleting] = useState<Set<string>>(new Set());
  const [bulkRestoring, setBulkRestoring] = useState(false);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/restore?campaignId=${campaignId}`);
      const json = await res.json();
      if (res.ok) {
        setContacts(json.data ?? []);
      } else {
        toast.error(json.error ?? "Failed to load recycle bin");
      }
    } catch {
      toast.error("Network error loading recycle bin");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  async function restoreContact(contactId: string) {
    setRestoring((prev) => new Set(prev).add(contactId));
    try {
      const res = await fetch("/api/contacts/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Contact restored");
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setSelected((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
      } else {
        toast.error(json.error ?? "Failed to restore contact");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRestoring((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
    }
  }

  async function permanentlyDelete(contactId: string) {
    if (!confirm("Permanently delete this contact? This cannot be undone.")) return;
    setPermanentlyDeleting((prev) => new Set(prev).add(contactId));
    try {
      const res = await fetch(`/api/contacts/${contactId}?permanent=true`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Contact permanently deleted");
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        setSelected((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
      } else {
        toast.error(json.error ?? "Failed to delete contact");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPermanentlyDeleting((prev) => { const s = new Set(prev); s.delete(contactId); return s; });
    }
  }

  async function bulkRestore() {
    if (selected.size === 0) return;
    setBulkRestoring(true);
    let successCount = 0;
    for (const contactId of Array.from(selected)) {
      try {
        const res = await fetch("/api/contacts/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId }),
        });
        if (res.ok) {
          successCount++;
          setContacts((prev) => prev.filter((c) => c.id !== contactId));
        }
      } catch { /* continue */ }
    }
    setSelected(new Set());
    setBulkRestoring(false);
    toast.success(`Restored ${successCount} contact${successCount !== 1 ? "s" : ""}`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycle Bin"
        description="Deleted contacts are kept here for 90 days before permanent removal."
        actions={
          selected.size > 0 ? (
            <Button
              onClick={bulkRestore}
              disabled={bulkRestoring}
              style={{ backgroundColor: "#1D9E75" }}
              className="text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {bulkRestoring ? "Restoring…" : `Restore ${selected.size} selected`}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {contacts.length > 0 && (
              <span className="text-sm text-gray-500">
                {contacts.length} deleted contact{contacts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10" />}
              title="Recycle bin is empty"
              description="Deleted contacts appear here for 90 days."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Support</th>
                    <th className="pb-3 pr-4 font-medium">Ward</th>
                    <th className="pb-3 pr-4 font-medium">Deleted</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{c.email ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SUPPORT_COLORS[c.supportLevel] ?? SUPPORT_COLORS.unknown}`}
                        >
                          {c.supportLevel.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{c.ward ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{formatDate(c.deletedAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => restoreContact(c.id)}
                            disabled={restoring.has(c.id)}
                            style={{ color: "#1D9E75" }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            {restoring.has(c.id) ? "Restoring…" : "Restore"}
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => permanentlyDelete(c.id)}
                              disabled={permanentlyDeleting.has(c.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              {permanentlyDeleting.has(c.id) ? "Deleting…" : "Delete"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && contacts.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Permanently deleted contacts cannot be recovered. Use this only when you are certain the contact should be removed entirely.
          </span>
        </div>
      )}
    </div>
  );
}
