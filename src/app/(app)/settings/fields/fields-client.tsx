"use client";
import { useState, useEffect } from "react";
import { Plus, Eye, EyeOff, Trash2, GripVertical, Settings } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Modal, FormField, Input, Select, Checkbox } from "@/components/ui";
import { toast } from "sonner";

interface CampaignField {
  id: string; key: string; label: string; fieldType: string; category: string;
  options: string[]; isVisible: boolean; isRequired: boolean; showOnCard: boolean; showOnList: boolean; sortOrder: number;
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
  const [newField, setNewField] = useState({ key: "", label: "", fieldType: "text", category: "custom", options: "", showOnCard: true, showOnList: false, isRequired: false });
  const [saving, setSaving] = useState(false);

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
      if (res.ok) { toast.success("Field added"); setShowAdd(false); setNewField({ key: "", label: "", fieldType: "text", category: "custom", options: "", showOnCard: true, showOnList: false, isRequired: false }); load(); }
      else { const e = await res.json(); toast.error(e.error ?? "Failed"); }
    } finally { setSaving(false); }
  }

  async function toggleVisible(field: CampaignField) {
    await fetch(`/api/campaign-fields?id=${field.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !field.isVisible }),
    });
    load();
  }

  async function deleteField(id: string) {
    if (!confirm("Delete this field? Data stored in this field will remain on contacts but won't be displayed.")) return;
    await fetch(`/api/campaign-fields?id=${id}`, { method: "DELETE" });
    toast.success("Field deleted");
    load();
  }

  // Auto-generate key from label
  function labelToKey(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    fields: fields.filter(f => f.category === cat.value),
  })).filter(g => g.fields.length > 0);

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <PageHeader
        title="Field Configuration"
        description="Control which fields appear on contact cards and canvassing views"
        actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Field</Button>}
      />

      {/* Built-in fields note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800">
            <strong>Built-in fields</strong> (name, address, phone, email, support level, GOTV status, etc.) are always available and can't be deleted, but you can hide them from canvassing cards using the toggles in your campaign settings.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : fields.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Settings className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No custom fields yet</p>
            <p className="text-xs text-gray-400 mt-1">Add fields specific to your campaign — issues, membership data, custom tracking</p>
            <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add first field</Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map(group => (
          <Card key={group.value}>
            <CardHeader>
              <h3 className="font-semibold text-sm text-gray-900">{group.label}</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {group.fields.map(field => (
                  <div key={field.id} className="flex items-center gap-3 px-5 py-3">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{field.label}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[field.category] ?? "bg-gray-100 text-gray-500"}`}>{field.category.replace("_", " ")}</span>
                        <span className="text-xs text-gray-400">{field.fieldType}</span>
                        {field.isRequired && <span className="text-xs text-red-500 font-medium">required</span>}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{field.key}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${field.showOnCard ? "text-emerald-600" : "text-gray-400"}`}>
                          {field.showOnCard ? "✓ On card" : "Not on card"}
                        </span>
                        <span className={`text-xs ${field.showOnList ? "text-emerald-600" : "text-gray-400"}`}>
                          {field.showOnList ? "✓ In table" : "Not in table"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleVisible(field)} title={field.isVisible ? "Hide field" : "Show field"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${field.isVisible ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                        {field.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteField(field.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Field Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Custom Field" size="md">
        <div className="space-y-4">
          <FormField label="Display Label" required>
            <Input
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value, key: labelToKey(e.target.value) })}
              placeholder="e.g. Hydro Concern, Member Since, Yard Sign Size"
            />
          </FormField>
          <FormField label="Field Key (auto-generated)">
            <Input
              value={newField.key}
              onChange={(e) => setNewField({ ...newField, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              placeholder="hydro_concern"
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, underscores only. Used in CSV exports.</p>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Field Type">
              <Select value={newField.fieldType} onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}>
                {FIELD_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
            <FormField label="Category">
              <Select value={newField.category} onChange={(e) => setNewField({ ...newField, category: e.target.value })}>
                {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>
          </div>
          {(newField.fieldType === "select" || newField.fieldType === "multiselect") && (
            <FormField label="Options (comma-separated)">
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
    </div>
  );
}
