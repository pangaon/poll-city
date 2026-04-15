"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Globe, Lock, Users, Calendar, Mail, Building2, Trash2, CheckCircle2, Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, PageHeader, FormField, Input, EmptyState } from "@/components/ui";

interface Coalition {
  id: string;
  organizationName: string;
  contactName: string | null;
  contactEmail: string | null;
  memberCount: number | null;
  endorsementDate: string | null;
  isPublic: boolean;
  logoUrl: string | null;
  createdAt: string;
}

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function CoalitionsClient({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<Coalition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const emptyForm = {
    organizationName: "",
    contactName: "",
    contactEmail: "",
    memberCount: "",
    endorsementDate: "",
    isPublic: false,
    logoUrl: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coalitions?campaignId=${campaignId}`);
      const data = (await res.json()) as { data?: Coalition[] };
      setRows(data.data ?? []);
    } catch {
      toast.error("Failed to load coalitions");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!form.organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        campaignId,
        organizationName: form.organizationName.trim(),
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        memberCount: form.memberCount ? parseInt(form.memberCount, 10) : null,
        endorsementDate: form.endorsementDate || null,
        isPublic: form.isPublic,
        logoUrl: form.logoUrl.trim() || null,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`/api/coalitions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/coalitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to save");
      }

      toast.success(editId ? "Coalition updated" : "Coalition added");
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save coalition");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCoalition(id: string) {
    try {
      const res = await fetch(`/api/coalitions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Coalition removed");
      setConfirmDeleteId(null);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to remove coalition");
    }
  }

  function startEdit(c: Coalition) {
    setForm({
      organizationName: c.organizationName,
      contactName: c.contactName ?? "",
      contactEmail: c.contactEmail ?? "",
      memberCount: c.memberCount != null ? String(c.memberCount) : "",
      endorsementDate: c.endorsementDate ? c.endorsementDate.slice(0, 10) : "",
      isPublic: c.isPublic,
      logoUrl: c.logoUrl ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  const totalMembers = rows.reduce((s, r) => s + (r.memberCount ?? 0), 0);
  const publicCount = rows.filter((r) => r.isPublic).length;

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <PageHeader
        title="Coalition Management"
        description="Track endorsing organizations and partners. Public endorsements appear on your candidate page."
        actions={
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Coalition
          </Button>
        }
      />

      {/* Summary stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-2xl font-bold" style={{ color: NAVY }}>{rows.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Endorsements</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-2xl font-bold" style={{ color: GREEN }}>{totalMembers.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total members represented</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-2xl font-bold" style={{ color: AMBER }}>{publicCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Public endorsements</p>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {editId ? "Edit Coalition" : "Add New Coalition"}
                  </h3>
                  <button
                    onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Organization Name *">
                    <Input
                      value={form.organizationName}
                      onChange={(e) => setForm((s) => ({ ...s, organizationName: e.target.value }))}
                      placeholder="Toronto Labour Council"
                    />
                  </FormField>
                  <FormField label="Primary Contact">
                    <Input
                      value={form.contactName}
                      onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))}
                      placeholder="Jane Smith"
                    />
                  </FormField>
                  <FormField label="Contact Email">
                    <Input
                      value={form.contactEmail}
                      onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                      placeholder="contact@org.ca"
                      type="email"
                    />
                  </FormField>
                  <FormField label="Members Represented">
                    <Input
                      value={form.memberCount}
                      onChange={(e) => setForm((s) => ({ ...s, memberCount: e.target.value }))}
                      placeholder="1200"
                      type="number"
                      min={0}
                    />
                  </FormField>
                  <FormField label="Endorsement Date">
                    <Input
                      value={form.endorsementDate}
                      onChange={(e) => setForm((s) => ({ ...s, endorsementDate: e.target.value }))}
                      type="date"
                    />
                  </FormField>
                  <FormField label="Logo URL (optional)">
                    <Input
                      value={form.logoUrl}
                      onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
                      placeholder="https://..."
                      type="url"
                    />
                  </FormField>
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm((s) => ({ ...s, isPublic: !s.isPublic }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isPublic ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isPublic ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Public endorsement</p>
                    <p className="text-xs text-slate-500">Visible on your candidate page and campaign website</p>
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={submit} loading={submitting}>
                    {editId ? "Save Changes" : "Add Coalition"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coalition list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No coalitions yet"
          description="Add endorsing organizations to track community support and boost credibility."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Coalition
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {rows.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={spring}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      {/* Logo or fallback */}
                      {c.logoUrl ? (
                        <img
                          src={c.logoUrl}
                          alt={c.organizationName}
                          className="h-10 w-10 rounded-lg object-contain border border-slate-200 shrink-0 bg-white"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: NAVY }}
                        >
                          {c.organizationName.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900 truncate">{c.organizationName}</p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  c.isPublic
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {c.isPublic ? (
                                  <><Globe className="h-3 w-3" /> Public</>
                                ) : (
                                  <><Lock className="h-3 w-3" /> Private</>
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                              {c.contactName && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {c.contactName}
                                </span>
                              )}
                              {c.contactEmail && (
                                <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-1 hover:text-slate-800">
                                  <Mail className="h-3 w-3" />
                                  {c.contactEmail}
                                </a>
                              )}
                              {c.memberCount != null && (
                                <span className="flex items-center gap-1 font-medium" style={{ color: GREEN }}>
                                  <Users className="h-3 w-3" />
                                  {c.memberCount.toLocaleString()} members
                                </span>
                              )}
                              {c.endorsementDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Endorsed {new Date(c.endorsementDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Edit coalition"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {confirmDeleteId === c.id ? (
                              <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2 py-1">
                                <span className="text-xs text-red-700">Delete?</span>
                                <button
                                  onClick={() => deleteCoalition(c.id)}
                                  className="text-xs font-semibold text-red-700 hover:text-red-900"
                                >
                                  Yes
                                </button>
                                <span className="text-red-300">/</span>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                title="Remove coalition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info card */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <strong className="text-slate-700">{publicCount} public endorsement{publicCount !== 1 ? "s" : ""}</strong>
            {" "}will appear on your candidate page.
            {publicCount < rows.length && ` ${rows.length - publicCount} private.`}
          </p>
        </div>
      )}
    </div>
  );
}
