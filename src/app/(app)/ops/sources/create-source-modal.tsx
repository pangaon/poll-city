"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { SOURCE_TYPE_LABELS } from "@/lib/sources/types";
import type { SourceType } from "@prisma/client";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateSourceModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    sourceType: "rss_feed" as SourceType,
    feedUrl: "",
    canonicalUrl: "",
    municipality: "",
    province: "",
    language: "en",
    country: "CA",
    credibilityScore: 5,
    priorityScore: 50,
    isRecommended: false,
    notesInternal: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSubmit = async () => {
    setError("");
    if (!form.name || !form.slug || !form.sourceType) {
      setError("Name, slug, and source type are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create source.");
        return;
      }
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#0A2342]">Add Source to Library</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="e.g. Whitby This Week — News RSS"
              value={form.name}
              onChange={(e) => setForm((f) => ({
                ...f,
                name: e.target.value,
                slug: autoSlug(e.target.value),
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              placeholder="whitby-this-week-news"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={form.sourceType}
              onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value as SourceType }))}
            >
              {(Object.entries(SOURCE_TYPE_LABELS) as [SourceType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feed URL</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="https://whitby.ca/feed"
              value={form.feedUrl}
              onChange={(e) => setForm((f) => ({ ...f, feedUrl: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">RSS or Atom feed URL. Used for automated polling.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="https://whitbythisweek.com"
              value={form.canonicalUrl}
              onChange={(e) => setForm((f) => ({ ...f, canonicalUrl: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Whitby"
                value={form.municipality}
                onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="ON"
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credibility (0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={form.credibilityScore}
                onChange={(e) => setForm((f) => ({ ...f, credibilityScore: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={form.priorityScore}
                onChange={(e) => setForm((f) => ({ ...f, priorityScore: parseInt(e.target.value, 10) }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              rows={2}
              placeholder="Notes visible only to Poll City admin"
              value={form.notesInternal}
              onChange={(e) => setForm((f) => ({ ...f, notesInternal: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRecommended}
              onChange={(e) => setForm((f) => ({ ...f, isRecommended: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Mark as recommended for campaigns</span>
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm hover:bg-[#0A2342]/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add Source
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
