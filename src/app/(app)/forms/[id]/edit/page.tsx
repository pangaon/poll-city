"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, GripVertical, Settings, Trash2, Plus, Save, ExternalLink, Copy, Check } from "lucide-react";

type Field = {
  id: string; type: string; label: string; placeholder: string | null; helpText: string | null;
  defaultValue: string | null; required: boolean; options: any; width: string; crmField: string | null;
  showIf: any; content: string | null; order: number;
};

const FIELD_TYPES = [
  { group: "Basic", items: [
    { type: "text", label: "Short Text", icon: "📝" }, { type: "textarea", label: "Long Text", icon: "📄" },
    { type: "email", label: "Email", icon: "📧" }, { type: "phone", label: "Phone", icon: "📱" },
    { type: "number", label: "Number", icon: "🔢" }, { type: "date", label: "Date", icon: "📅" },
    { type: "select", label: "Dropdown", icon: "⬇️" }, { type: "multiselect", label: "Multiple Choice", icon: "☑️" },
    { type: "radio", label: "Single Choice", icon: "🔘" },
  ]},
  { group: "Contact", items: [
    { type: "name", label: "Full Name", icon: "👤" }, { type: "address", label: "Address", icon: "🏠" },
    { type: "postal_code", label: "Postal Code", icon: "📮" },
  ]},
  { group: "Layout", items: [
    { type: "heading", label: "Heading", icon: "H" }, { type: "paragraph", label: "Paragraph", icon: "¶" },
    { type: "divider", label: "Divider", icon: "──" },
  ]},
  { group: "Special", items: [
    { type: "rating", label: "Rating", icon: "⭐" }, { type: "consent", label: "Consent", icon: "✅" },
    { type: "hidden", label: "Hidden", icon: "👁️" },
  ]},
];

const CRM_FIELDS = [
  { value: "", label: "(none)" }, { value: "name", label: "Full Name" }, { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" }, { value: "email", label: "Email" }, { value: "phone", label: "Phone" },
  { value: "address", label: "Address" }, { value: "postalCode", label: "Postal Code" }, { value: "ward", label: "Ward" },
  { value: "supportLevel", label: "Support Level" }, { value: "notes", label: "Notes (append)" },
];

export default function FormEditPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;
  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${formId}`).then((r) => r.json()).then((data) => {
      setForm(data);
      setFields(data.fields ?? []);
    }).finally(() => setLoading(false));
  }, [formId]);

  const addField = useCallback(async (type: string) => {
    const typeInfo = FIELD_TYPES.flatMap((g) => g.items).find((i) => i.type === type);
    const res = await fetch(`/api/forms/${formId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, label: typeInfo?.label ?? type, required: false, width: "full" }),
    });
    if (res.ok) {
      const field = await res.json();
      setFields((prev) => [...prev, field]);
      setSelectedField(field.id);
    }
  }, [formId]);

  const updateField = useCallback(async (fieldId: string, updates: Partial<Field>) => {
    setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, ...updates } : f));
    setSaving(true);
    await fetch(`/api/forms/${formId}/fields/${fieldId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [formId]);

  const deleteField = useCallback(async (fieldId: string) => {
    if (!confirm("Delete this field?")) return;
    await fetch(`/api/forms/${formId}/fields/${fieldId}`, { method: "DELETE" });
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedField === fieldId) setSelectedField(null);
  }, [formId, selectedField]);

  const moveField = useCallback(async (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    setFields(newFields);
    await fetch(`/api/forms/${formId}/fields/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldIds: newFields.map((f) => f.id) }),
    });
  }, [fields, formId]);

  const selected = fields.find((f) => f.id === selectedField);

  if (loading) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/forms" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <span className="font-semibold text-gray-900 truncate max-w-[200px]">{form?.name}</span>
          <span className="text-xs text-gray-400">
            {saving ? "Saving..." : saved ? "Saved ✓" : `${fields.length} fields`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${form?.slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Link</>}
          </button>
          <a href={`/f/${form?.slug}`} target="_blank" rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Eye className="h-3 w-3" /> Preview
          </a>
          <Link href={`/forms/${formId}/results`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Results ({form?.submissionCount ?? 0})
          </Link>
        </div>
      </div>

      {/* Builder */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Field Palette */}
        <div className="w-56 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0 p-3 space-y-4">
          {FIELD_TYPES.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addField(item.type)}
                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Centre — Canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Form header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              {form?.logoUrl && <img src={form.logoUrl} alt="" className="h-12 w-12 mx-auto mb-3 rounded-lg" />}
              <h2 className="text-2xl font-bold text-gray-900">{form?.title}</h2>
              {form?.description && <p className="text-gray-500 mt-1">{form.description}</p>}
            </div>

            {/* Fields */}
            {fields.map((field, index) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => { if (dragIndex !== null && dragIndex !== index) moveField(dragIndex, index); setDragIndex(null); }}
                onClick={() => setSelectedField(field.id)}
                className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${selectedField === field.id ? "border-blue-500 shadow-sm" : "border-gray-200"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                    <span className="text-xs text-gray-400 uppercase font-medium">{field.type}</span>
                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
                    {field.required && <span className="text-red-500 text-xs">*</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedField(field.id); }} className="p-1 text-gray-400 hover:text-gray-600"><Settings className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {field.type === "heading" ? (
                  <h3 className="text-lg font-semibold text-gray-800">{field.label}</h3>
                ) : field.type === "paragraph" ? (
                  <p className="text-sm text-gray-600">{field.content || field.label}</p>
                ) : field.type === "divider" ? (
                  <hr className="border-gray-200" />
                ) : field.type === "rating" ? (
                  <div className="flex gap-1 text-2xl text-gray-300">★★★★★</div>
                ) : field.type === "consent" ? (
                  <label className="flex items-start gap-2 text-sm text-gray-600"><input type="checkbox" disabled className="mt-0.5" />{field.label}</label>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-400">
                    {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  </div>
                )}
              </div>
            ))}

            {/* Empty / add more */}
            {fields.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500 font-medium">Drag fields here to build your form</p>
                <p className="text-gray-400 text-sm mt-1">Or click any field type in the left palette</p>
              </div>
            ) : (
              <button onClick={() => {}} className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Add a field from the palette
              </button>
            )}
          </div>
        </div>

        {/* Right — Field Settings */}
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          {selected ? (
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm text-gray-900">Field Settings</h3>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              {!["heading", "paragraph", "divider", "consent"].includes(selected.type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                  <input value={selected.placeholder ?? ""} onChange={(e) => updateField(selected.id, { placeholder: e.target.value || null })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Help text</label>
                <input value={selected.helpText ?? ""} onChange={(e) => updateField(selected.id, { helpText: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              {(selected.type === "paragraph" || selected.type === "heading") && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
                  <textarea value={selected.content ?? ""} onChange={(e) => updateField(selected.id, { content: e.target.value || null })} rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Required</span>
                <button onClick={() => updateField(selected.id, { required: !selected.required })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${selected.required ? "bg-blue-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${selected.required ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                <div className="flex gap-1">
                  {(["full", "half", "third"] as const).map((w) => (
                    <button key={w} onClick={() => updateField(selected.id, { width: w })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${selected.width === w ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {w === "full" ? "Full" : w === "half" ? "Half" : "Third"}
                    </button>
                  ))}
                </div>
              </div>

              {/* CRM Mapping */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1">Map to CRM field</label>
                <select value={selected.crmField ?? ""} onChange={(e) => updateField(selected.id, { crmField: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {CRM_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {/* Options editor for select/multiselect/radio */}
              {["select", "multiselect", "radio", "checkbox"].includes(selected.type) && (
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Options</label>
                  <div className="space-y-1">
                    {(selected.options as { value: string; label: string }[] ?? []).map((opt: any, i: number) => (
                      <div key={i} className="flex gap-1">
                        <input value={opt.label} onChange={(e) => {
                          const newOpts = [...(selected.options ?? [])];
                          newOpts[i] = { value: e.target.value.toLowerCase().replace(/\s+/g, "_"), label: e.target.value };
                          updateField(selected.id, { options: newOpts });
                        }} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs" placeholder="Option text" />
                        <button onClick={() => {
                          const newOpts = (selected.options ?? []).filter((_: any, j: number) => j !== i);
                          updateField(selected.id, { options: newOpts });
                        }} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const newOpts = [...(selected.options ?? []), { value: `option_${(selected.options?.length ?? 0) + 1}`, label: "" }];
                      updateField(selected.id, { options: newOpts });
                    }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add option</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-400 mt-12">
              <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Click a field to edit its settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
