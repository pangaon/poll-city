"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, FileText, Globe, Save, Send } from "lucide-react";
import { Button } from "@/components/ui";

interface Page {
  id: string; title: string; slug: string; summary: string;
  body: string; seoTitle: string; seoDescription: string;
  publishStatus: string; publishedAt: string | null;
  issue: { id: string; title: string } | null;
}

interface Props {
  campaignId: string;
  pageId: string | null;
  prefillIssueId?: string;
}

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export default function PageEditorClient({ campaignId, pageId, prefillIssueId }: Props) {
  const router = useRouter();
  const isNew = !pageId;

  const [form, setForm] = useState({
    title: "", slug: "", summary: "", body: "",
    seoTitle: "", seoDescription: "", issueId: prefillIssueId ?? "",
    publishStatus: "draft",
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "settings">("content");

  const load = useCallback(async () => {
    if (isNew) return;
    const res = await fetch(`/api/reputation/pages/${pageId}?campaignId=${campaignId}`);
    if (res.ok) {
      const { page } = await res.json() as { page: Page };
      setForm({
        title: page.title, slug: page.slug, summary: page.summary ?? "",
        body: page.body, seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        issueId: page.issue?.id ?? "",
        publishStatus: page.publishStatus,
      });
    }
    setLoading(false);
  }, [campaignId, isNew, pageId]);

  useEffect(() => { load(); }, [load]);

  const save = async (publishStatus?: string) => {
    setSaving(true);
    const status = publishStatus ?? form.publishStatus;
    const method = isNew ? "POST" : "PATCH";
    const url = isNew ? "/api/reputation/pages" : `/api/reputation/pages/${pageId}`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        ...form,
        publishStatus: status,
        issueId: form.issueId || undefined,
      }),
    });

    if (res.ok) {
      const { page } = await res.json();
      if (isNew) {
        router.push(`/reputation/pages/${page.id}?campaignId=${campaignId}`);
      } else {
        setForm((f) => ({ ...f, publishStatus: status }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/reputation/pages?campaignId=${campaignId}`)}
              className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                {isNew ? "New Response Page" : form.title || "Untitled Page"}
              </h1>
              {!isNew && form.slug && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> /{form.slug}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs px-2.5 py-1.5 rounded-full font-medium self-center ${form.publishStatus === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {form.publishStatus}
            </span>
            <Button variant="outline" size="sm" onClick={() => save()} disabled={saving} className="gap-1">
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Draft"}
            </Button>
            {form.publishStatus !== "published" && (
              <Button size="sm" onClick={() => save("published")} disabled={saving}
                style={{ background: GREEN }} className="gap-1">
                <Send className="w-3.5 h-3.5" /> Publish
              </Button>
            )}
            {form.publishStatus === "published" && (
              <Button size="sm" variant="outline" onClick={() => save("unpublished")} disabled={saving}>
                Unpublish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {(["content","seo","settings"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition ${activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        {activeTab === "content" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Page Title *</label>
              <input required value={form.title}
                onChange={(e) => setForm((f) => ({
                  ...f, title: e.target.value,
                  slug: f.slug || slugify(e.target.value),
                }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="e.g. Our Position on Housing Policy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
              <textarea rows={2} value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="One paragraph summary for listings and previews" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Page Body *</label>
              <textarea rows={16} value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none resize-y font-mono"
                placeholder="Full page content. Markdown supported." />
              <p className="text-xs text-gray-400 mt-1">Markdown formatting is supported.</p>
            </div>
          </div>
        )}

        {activeTab === "seo" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/</span>
                <input value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="url-slug-here" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SEO Title</label>
              <input value={form.seoTitle}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                placeholder="Defaults to page title if blank" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SEO Description</label>
              <textarea rows={3} value={form.seoDescription}
                onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="150–160 characters for search engines" />
              <p className="text-xs text-gray-400 mt-1">{form.seoDescription.length} / 160</p>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Search Preview</p>
              <p className="text-sm text-indigo-700 font-medium line-clamp-1">
                {form.seoTitle || form.title || "Page Title"}
              </p>
              <p className="text-xs text-green-700">poll.city/response/{form.slug || "url-slug"}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {form.seoDescription || form.summary || "Page description will appear here."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Publish Status</label>
              <select value={form.publishStatus}
                onChange={(e) => setForm((f) => ({ ...f, publishStatus: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                {["draft","review","published","unpublished","archived"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
