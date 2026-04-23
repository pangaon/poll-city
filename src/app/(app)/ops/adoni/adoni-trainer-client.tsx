"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Sparkles, ChevronDown, ChevronRight } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

const CATEGORIES = [
  { key: "canvassing", label: "Canvassing" },
  { key: "signs", label: "Signs" },
  { key: "gotv", label: "GOTV" },
  { key: "fundraising", label: "Fundraising" },
  { key: "volunteers", label: "Volunteers" },
  { key: "platform", label: "Platform" },
  { key: "general", label: "General" },
] as const;

type Category = typeof CATEGORIES[number]["key"];

interface WisdomEntry {
  id: string;
  category: Category;
  title: string;
  content: string;
  tags: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface ExtractedEntry {
  category: Category;
  title: string;
  content: string;
  tags: string[];
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function AdoniTrainerClient() {
  const [entries, setEntries] = useState<WisdomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [expanded, setExpanded] = useState<Record<Category, boolean>>({
    canvassing: true, signs: false, gotv: false, fundraising: false, volunteers: false, platform: false, general: false,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracted, setExtracted] = useState<ExtractedEntry[]>([]);
  const [selectedExtracted, setSelectedExtracted] = useState<Set<number>>(new Set());

  const [form, setForm] = useState({ category: "general" as Category, title: "", content: "", tags: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/adoni-wisdom");
      const data = await res.json() as { entries: WisdomEntry[] };
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleActive(id: string, current: boolean) {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, isActive: !current } : e));
    await fetch(`/api/ops/adoni-wisdom/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this wisdom entry?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/ops/adoni-wisdom/${id}`, { method: "DELETE" });
  }

  async function saveNew() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ops/adoni-wisdom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          content: form.content,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json() as { entry: WisdomEntry };
      setEntries((prev) => [data.entry, ...prev]);
      setForm({ category: "general", title: "", content: "", tags: "" });
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function extractFromTranscript() {
    if (!transcript.trim()) return;
    setExtracting(true);
    setExtracted([]);
    setSelectedExtracted(new Set());
    try {
      const res = await fetch("/api/ops/adoni-wisdom/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json() as { entries: ExtractedEntry[] };
      setExtracted(data.entries ?? []);
      setSelectedExtracted(new Set(data.entries.map((_, i) => i)));
    } finally {
      setExtracting(false);
    }
  }

  async function saveExtracted() {
    if (selectedExtracted.size === 0) return;
    setSaving(true);
    try {
      const toSave = extracted.filter((_, i) => selectedExtracted.has(i));
      const created: WisdomEntry[] = [];
      for (const e of toSave) {
        const res = await fetch("/api/ops/adoni-wisdom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(e),
        });
        const data = await res.json() as { entry: WisdomEntry };
        created.push(data.entry);
      }
      setEntries((prev) => [...created, ...prev]);
      setTranscript("");
      setExtracted([]);
      setShowExtract(false);
    } finally {
      setSaving(false);
    }
  }

  const byCategory = (cat: Category) => entries.filter((e) => e.category === cat);
  const activeCount = entries.filter((e) => e.isActive).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: NAVY }}>
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Adoni Training</h1>
              <p className="text-sm text-slate-500">{activeCount} active wisdom entries injected into every Adoni conversation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowExtract(true); setShowAddForm(false); }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" style={{ color: GREEN }} />
              Extract from transcript
            </button>
            <button
              onClick={() => { setShowAddForm(true); setShowExtract(false); }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white"
              style={{ backgroundColor: NAVY }}
            >
              <Plus className="h-4 w-4" />
              Add wisdom
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">

        {/* Otter extract panel */}
        <AnimatePresence>
          {showExtract && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900 mb-1">Extract from Otter transcript</h2>
              <p className="text-sm text-slate-500 mb-3">Paste a raw transcript or voice notes. Adoni extracts the structured campaign tactics.</p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your Otter transcript or notes here..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                style={{ minHeight: 140, "--tw-ring-color": GREEN } as React.CSSProperties}
              />
              {extracted.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{extracted.length} tactics found — select which to save:</p>
                    <button
                      onClick={() => setSelectedExtracted(new Set(extracted.map((_, i) => i)))}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Select all
                    </button>
                  </div>
                  {extracted.map((e, i) => (
                    <label key={i} className="flex gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedExtracted.has(i)}
                        onChange={() => {
                          setSelectedExtracted((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          });
                        }}
                        className="mt-0.5 h-4 w-4 rounded"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">{e.category}</span>
                          <p className="text-sm font-medium text-slate-900">{e.title}</p>
                        </div>
                        <p className="text-sm text-slate-600">{e.content}</p>
                        {e.tags.length > 0 && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {e.tags.map((t) => <span key={t} className="text-xs text-slate-400">#{t}</span>)}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {extracted.length === 0 ? (
                  <button
                    onClick={extractFromTranscript}
                    disabled={extracting || !transcript.trim()}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
                    style={{ backgroundColor: GREEN }}
                  >
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {extracting ? "Extracting..." : "Extract tactics"}
                  </button>
                ) : (
                  <button
                    onClick={saveExtracted}
                    disabled={saving || selectedExtracted.size === 0}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
                    style={{ backgroundColor: NAVY }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save {selectedExtracted.size} selected
                  </button>
                )}
                <button onClick={() => { setShowExtract(false); setTranscript(""); setExtracted([]); }} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900 mb-3">Add wisdom entry</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                  >
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="signs, gotv, ontario"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Short title — what is this tactic about?"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Wisdom</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write the tactical insight in plain prose. No bullet points. Adoni will use this verbatim when relevant."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none resize-none"
                  style={{ minHeight: 100 }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveNew}
                  disabled={saving || !form.title.trim() || !form.content.trim()}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
                  style={{ backgroundColor: NAVY }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save entry
                </button>
                <button onClick={() => setShowAddForm(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entries by category */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          CATEGORIES.map(({ key, label }) => {
            const catEntries = byCategory(key);
            const isExpanded = expanded[key];
            return (
              <div key={key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="font-medium text-slate-900">{label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {catEntries.filter((e) => e.isActive).length}/{catEntries.length} active
                    </span>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                    >
                      {catEntries.length === 0 ? (
                        <p className="px-5 pb-4 text-sm text-slate-400">No entries yet. Add one above.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {catEntries.map((e) => (
                            <div key={e.id} className={`px-5 py-4 ${e.isActive ? "" : "opacity-50"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-900">{e.title}</p>
                                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{e.content}</p>
                                  {e.tags.length > 0 && (
                                    <div className="mt-2 flex gap-1.5 flex-wrap">
                                      {e.tags.map((t) => (
                                        <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">#{t}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => toggleActive(e.id, e.isActive)}
                                    className="text-slate-400 hover:text-slate-700"
                                    title={e.isActive ? "Deactivate" : "Activate"}
                                  >
                                    {e.isActive
                                      ? <ToggleRight className="h-5 w-5" style={{ color: GREEN }} />
                                      : <ToggleLeft className="h-5 w-5" />}
                                  </button>
                                  <button onClick={() => deleteEntry(e.id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
