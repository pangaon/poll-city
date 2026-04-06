"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Eye, BarChart3, Share2, Copy, ExternalLink, MoreHorizontal } from "lucide-react";

type FormItem = {
  id: string;
  name: string;
  slug: string;
  title: string;
  isActive: boolean;
  viewCount: number;
  submissionCount: number;
  createdAt: string;
  _count: { submissions: number; fields: number };
};

type Template = {
  key: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  fieldCount: number;
};

export default function FormsListPage() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/forms").then((r) => r.json()),
      fetch("/api/forms/templates").then((r) => r.json()),
    ]).then(([formsData, templatesData]) => {
      setForms(Array.isArray(formsData) ? formsData : []);
      setTemplates(templatesData.templates ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function createForm() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const template = templates.find((t) => t.key === selectedTemplate);
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          title: template?.title ?? newName.trim(),
          description: template?.description ?? null,
          templateKey: selectedTemplate ?? undefined,
        }),
      });
      if (res.ok) {
        const form = await res.json();
        window.location.href = `/forms/${form.id}/edit`;
      }
    } finally {
      setCreating(false);
    }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6" style={{ color: "#1a4782" }} />
            Forms
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {forms.length} form{forms.length !== 1 ? "s" : ""} · {forms.reduce((s, f) => s + f.submissionCount, 0)} total submissions
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: "#1a4782" }}
        >
          <Plus className="h-4 w-4" />
          Create Form
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create a New Form</h2>
              <p className="text-sm text-gray-500 mt-1">Start from scratch or use a template</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Volunteer Intake Form"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start with a template (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className={`rounded-lg border-2 p-3 text-left text-xs transition-all ${!selectedTemplate ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <span className="text-lg block mb-1">📝</span>
                    <span className="font-medium">Blank Form</span>
                  </button>
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setSelectedTemplate(t.key); if (!newName) setNewName(t.name); }}
                      className={`rounded-lg border-2 p-3 text-left text-xs transition-all ${selectedTemplate === t.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <span className="text-lg block mb-1">{t.icon}</span>
                      <span className="font-medium block">{t.name}</span>
                      <span className="text-gray-500">{t.fieldCount} fields</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={createForm}
                disabled={!newName.trim() || creating}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#1a4782" }}
              >
                {creating ? "Creating..." : "Create Form"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {forms.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No forms yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your first form to start collecting volunteer signups, petition signatures, event registrations, and more.
            Every submission becomes a contact in your CRM automatically.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#1a4782" }}
          >
            <Plus className="h-4 w-4" />
            Create Your First Form
          </button>
        </div>
      )}

      {/* Form cards */}
      <div className="space-y-3">
        {forms.map((form) => (
          <div key={form.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${form.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                  <h3 className="text-base font-semibold text-gray-900 truncate">{form.name}</h3>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {window.location.origin}/f/{form.slug} · {form._count.fields} fields · {form.submissionCount} submission{form.submissionCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {form.viewCount} views · Created {new Date(form.createdAt).toLocaleDateString("en-CA")}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Link href={`/forms/${form.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  Edit
                </Link>
                <a href={`/f/${form.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  <Eye className="h-3 w-3" /> Preview
                </a>
                <Link href={`/forms/${form.id}/results`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  <BarChart3 className="h-3 w-3" /> Results
                </Link>
                <button onClick={() => copyLink(form.slug)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  {copied === form.slug ? "Copied!" : <><Copy className="h-3 w-3" /> Share</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
