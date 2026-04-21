"use client";
import { useState, useEffect } from "react";
import {
  Plus, Eye, EyeOff, Trash2, GripVertical, Settings, ArrowUp, ArrowDown,
  ClipboardList, ToggleLeft, ToggleRight, Smartphone,
} from "lucide-react";
import {
  Button, Card, CardHeader, CardContent, PageHeader, Modal, FormField,
  Input, Select, Checkbox,
} from "@/components/ui";
import { toast } from "sonner";

interface CampaignField {
  id: string; key: string; label: string; fieldType: string; category: string;
  options: string[]; isVisible: boolean; isRequired: boolean; showOnCard: boolean;
  showOnList: boolean; sortOrder: number;
}

interface Props { campaignId: string; }

const FIELD_TYPES = [
  { value: "text", label: "Text (single line)" },
  { value: "textarea", label: "Text (multi-line)" },
  { value: "boolean", label: "Yes / No toggle" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown (single select)" },
  { value: "multiselect", label: "Multi-select" },
];

const CATEGORIES = [
  { value: "contact_info", label: "Contact Info" },
  { value: "canvassing", label: "Canvassing" },
  { value: "membership", label: "Membership" },
  { value: "electoral", label: "Electoral Geography" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, string> = {
  contact_info: "bg-blue-100 text-blue-700",
  canvassing: "bg-emerald-100 text-emerald-700",
  membership: "bg-purple-100 text-purple-700",
  electoral: "bg-amber-100 text-amber-700",
  custom: "bg-gray-100 text-gray-600",
};

export default function FieldsSettingsClient({ campaignId }: Props) {
  const [fields, setFields] = useState<CampaignField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newField, setNewField] = useState({
    key: "", label: "", fieldType: "text", category: "custom", options: "",
    showOnCard: true, showOnList: false, isRequired: false,
  });
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [confirmDeleteFieldId, setConfirmDeleteFieldId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaign-fields?campaignId=${campaignId}`);
      const data = await res.json();
      setFields(data.data ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [campaignId]);

  async function addField() {
    if (!newField.key || !newField.label) return toast.error("Key and label are required");
    setSaving(true);
    try {
      const res = await fetch("/api/campaign-fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId, ...newField,
          options: newField.options ? newField.options.split(",").map(s => s.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        toast.success("Field added");
        setShowAdd(false);
        setNewField({ key: "", label: "", fieldType: "text", category: "custom", options: "", showOnCard: true, showOnList: false, isRequired: false });
        load();
      } else {
        const e = await res.json();
        toast.error(e.error ?? "Failed");
      }
    } finally { setSaving(false); }
  }

  async function toggleVisible(field: CampaignField) {
    const res = await fetch(`/api/campaign-fields?id=${field.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !field.isVisible }),
    });
    if (!res.ok) { toast.error("Failed to update field visibility"); return; }
    load();
  }

  async function togglePlacement(field: CampaignField, key: "showOnCard" | "showOnList") {
    const res = await fetch(`/api/campaign-fields?id=${field.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !field[key] }),
    });
    if (!res.ok) { toast.error("Failed to update field placement"); return; }
    load();
  }

  async function deleteField(id: string) {
    if (!confirm("Delete this field? Data stored in this field will remain on contacts but won't be displayed.")) return;
    const res = await fetch(`/api/campaign-fields?id=${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete field"); return; }
    toast.success("Field deleted");
    load();
  }

  async function reorderField(fieldId: string, direction: "up" | "down") {
    const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const index = sorted.findIndex((f) => f.id === fieldId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const swapped = [...sorted];
    [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
    const withOrder = swapped.map((f, i) => ({ ...f, sortOrder: i + 1 }));
    const map = new Map(withOrder.map((f) => [f.id, f]));
    setFields((prev) => prev.map((f) => map.get(f.id) ?? f));

    setReordering(true);
    try {
      const updates = [withOrder[index], withOrder[targetIndex]];
      const result = await Promise.all(
        updates.map((f) =>
          fetch(`/api/campaign-fields?id=${f.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: f.sortOrder }),
          })
        )
      );
      if (result.some((r) => !r.ok)) { toast.error("Failed to save field order"); load(); return; }
      toast.success("Field order updated");
    } finally { setReordering(false); }
  }

  function labelToKey(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  // Separate built-in from custom fields
  const builtInFields = fields.filter((f) => f.key.startsWith("__"));
  const customFields = fields.filter((f) => !f.key.startsWith("__"));

  const builtInGrouped = CATEGORIES.map((cat) => ({
    ...cat,
    fields: builtInFields.filter((f) => f.category === cat.value),
  })).filter((g) => g.fields.length > 0);

  const customGrouped = CATEGORIES.map((cat) => ({
    ...cat,
    fields: customFields.filter((f) => f.category === cat.value),
  })).filter((g) => g.fields.length > 0);

  // Fields visible on canvassing card for preview
  const cardFields = fields.filter((f) => f.isVisible && f.showOnCard);

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <PageHeader
        title="Field Configuration"
        description="Control which fields appear on contact cards and canvassing views"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
              <Smartphone className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Field
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl shimmer-skeleton" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Built-in Fields ── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              Built-in Fields
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Standard fields for every campaign. Toggle visibility for canvassing cards and the contacts table.
            </p>
          </div>

          {builtInGrouped.map((group) => (
            <Card key={group.value}>
              <CardHeader>
                <h3 className="font-semibold text-sm text-gray-900">{group.label}</h3>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {group.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${field.isVisible ? "text-gray-900" : "text-gray-400"}`}>
                            {field.label}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[field.category] ?? "bg-gray-100 text-gray-500"}`}>
                            {field.category.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            onClick={() => togglePlacement(field, "showOnCard")}
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${
                              field.showOnCard ? "text-[#1D9E75]" : "text-gray-400"
                            } hover:underline`}
                          >
                            {field.showOnCard ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            {field.showOnCard ? "On card" : "Not on card"}
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            onClick={() => togglePlacement(field, "showOnList")}
                            className={`inline-flex items-center gap-1 text-xs transition-colors ${
                              field.showOnList ? "text-[#1D9E75]" : "text-gray-400"
                            } hover:underline`}
                          >
                            {field.showOnList ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            {field.showOnList ? "In table" : "Not in table"}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleVisible(field)}
                        title={field.isVisible ? "Hide field" : "Show field"}
                        className={`w-9 h-9 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-colors ${
                          field.isVisible
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {field.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* ── Custom Fields ── */}
          <div className="pt-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              Custom Fields
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Fields specific to your campaign. Add issues, membership data, or any custom tracking you need.
            </p>
          </div>

          {customFields.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Settings className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No custom fields yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add fields specific to your campaign — issues, membership data, custom tracking
                </p>
                <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add first field
                </Button>
              </CardContent>
            </Card>
          ) : (
            customGrouped.map((group) => (
              <Card key={group.value}>
                <CardHeader>
                  <h3 className="font-semibold text-sm text-gray-900">{group.label}</h3>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {group.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-3 px-5 py-3">
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{field.label}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[field.category] ?? "bg-gray-100 text-gray-500"}`}>
                              {field.category.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-400">{field.fieldType}</span>
                            {field.isRequired && <span className="text-xs text-red-500 font-medium">required</span>}
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{field.key}</p>
                          {field.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.options.map((opt) => (
                                <span key={opt} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => togglePlacement(field, "showOnCard")}
                              className={`inline-flex items-center gap-1 text-xs ${field.showOnCard ? "text-[#1D9E75]" : "text-gray-400"} hover:underline`}
                            >
                              {field.showOnCard ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              {field.showOnCard ? "On card" : "Not on card"}
                            </button>
                            <span className="text-gray-200">|</span>
                            <button
                              onClick={() => togglePlacement(field, "showOnList")}
                              className={`inline-flex items-center gap-1 text-xs ${field.showOnList ? "text-[#1D9E75]" : "text-gray-400"} hover:underline`}
                            >
                              {field.showOnList ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              {field.showOnList ? "In table" : "Not in table"}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => reorderField(field.id, "up")}
                            disabled={reordering}
                            title="Move up"
                            className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => reorderField(field.id, "down")}
                            disabled={reordering}
                            title="Move down"
                            className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleVisible(field)}
                            title={field.isVisible ? "Hide field" : "Show field"}
                            className={`w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-colors ${
                              field.isVisible
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            {field.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          {confirmDeleteFieldId === field.id ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                              <span className="text-xs text-red-600 font-medium">Delete field?</span>
                              <button
                                onClick={() => { deleteField(field.id); setConfirmDeleteFieldId(null); }}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 px-1"
                              >Yes</button>
                              <button
                                onClick={() => setConfirmDeleteFieldId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 px-1"
                              >Cancel</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteFieldId(field.id)}
                              title="Delete this custom field — this cannot be undone"
                              className="inline-flex items-center gap-1 px-2 py-1 min-h-[36px] rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs font-medium transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}

      {/* ── Add Field Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Custom Field" size="md">
        <div className="space-y-4">
          <FormField
            label="Display Label"
            required
            help={{
              content: "The label your team sees in the contact record and canvassing card.",
              example: "Lawn Sign Requested, Called Back, Donor Tier",
            }}
          >
            <Input
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value, key: labelToKey(e.target.value) })}
              placeholder="e.g. Hydro Concern, Member Since, Yard Sign Size"
            />
          </FormField>
          <FormField
            label="Field Key (auto-generated)"
            help={{
              content: "The internal identifier for this field. Auto-generated from the label — only change it if you need a specific key for integrations.",
              example: "hydro_concern, member_since",
            }}
            hint="Lowercase letters, numbers, underscores only. Used in CSV exports."
          >
            <Input
              value={newField.key}
              onChange={(e) => setNewField({ ...newField, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              placeholder="hydro_concern"
              className="font-mono text-xs"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Field Type"
              help={{
                content: "Choose how this data is captured. Text for open responses, Yes/No for checkboxes, Dropdown for fixed options.",
              }}
            >
              <Select value={newField.fieldType} onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}>
                {FIELD_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField
              label="Category"
              help={{
                content: "Groups this field with similar fields in the contact record. Canvassing fields appear on the door-knocking card.",
              }}
            >
              <Select value={newField.category} onChange={(e) => setNewField({ ...newField, category: e.target.value })}>
                {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
          </div>
          {(newField.fieldType === "select" || newField.fieldType === "multiselect") && (
            <FormField
              label="Options (comma-separated)"
              help={{
                content: "The choices available in the dropdown or multi-select. Add as many as you need.",
                example: "Strong Support, Leaning Support, Undecided, Opposed",
              }}
            >
              <Input value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} placeholder="Option 1, Option 2, Option 3" />
            </FormField>
          )}
          <div className="flex gap-4 flex-wrap">
            <Checkbox label="Show on canvassing card" checked={newField.showOnCard} onChange={(e) => setNewField({ ...newField, showOnCard: e.target.checked })} />
            <Checkbox label="Show in contacts table" checked={newField.showOnList} onChange={(e) => setNewField({ ...newField, showOnList: e.target.checked })} />
            <Checkbox label="Required field" checked={newField.isRequired} onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
            <Button onClick={addField} loading={saving} disabled={!newField.key || !newField.label} className="flex-1">Add Field</Button>
          </div>
        </div>
      </Modal>

      {/* ── Canvasser Preview Modal ── */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Canvasser Card Preview" size="md">
        <p className="text-xs text-gray-500 mb-4">This is what your canvasser will see at the door.</p>
        <div
          className="mx-auto rounded-2xl border-2 border-gray-200 bg-white overflow-hidden"
          style={{ maxWidth: 390 }}
        >
          {/* Mock phone header */}
          <div className="bg-[#0A2342] px-4 py-3">
            <p className="text-white text-sm font-semibold">123 Main Street</p>
            <p className="text-white/60 text-xs">John Doe</p>
          </div>
          <div className="p-4 space-y-3">
            {cardFields.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No fields enabled for the canvassing card
              </p>
            ) : (
              cardFields.map((field) => (
                <div key={field.id}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
                  {field.fieldType === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-5 bg-gray-200 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                      </div>
                      <span className="text-xs text-gray-400">No</span>
                    </div>
                  ) : field.fieldType === "select" || field.fieldType === "multiselect" ? (
                    <div className="flex flex-wrap gap-1">
                      {field.options.length > 0 ? field.options.slice(0, 4).map((opt) => (
                        <span key={opt} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {opt}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-300">No options defined</span>
                      )}
                      {field.options.length > 4 && (
                        <span className="text-xs text-gray-400">+{field.options.length - 4} more</span>
                      )}
                    </div>
                  ) : field.fieldType === "textarea" ? (
                    <div className="h-14 bg-gray-50 rounded-lg border border-gray-200" />
                  ) : (
                    <div className="h-9 bg-gray-50 rounded-lg border border-gray-200" />
                  )}
                </div>
              ))
            )}
            {/* Mock save button */}
            <div className="pt-2">
              <div className="w-full h-11 rounded-xl bg-[#1D9E75] flex items-center justify-center">
                <span className="text-white text-sm font-semibold">Save & Next Door</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
