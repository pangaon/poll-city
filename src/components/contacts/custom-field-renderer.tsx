"use client";
/**
 * CustomFieldRenderer — renders any custom field type for display or editing.
 * Used on: contact cards (canvassing), contact detail page, contact edit form.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CustomFieldDisplay, CustomFieldRawValue } from "@/lib/db/custom-fields";

interface Props {
  field: CustomFieldDisplay;
  editing?: boolean;
  onChange?: (key: string, value: CustomFieldRawValue) => void;
  compact?: boolean; // for canvassing cards
}

export function CustomFieldRenderer({ field, editing = false, onChange, compact = false }: Props) {
  const [localValue, setLocalValue] = useState<CustomFieldRawValue>(field.value);

  function update(value: CustomFieldRawValue) {
    setLocalValue(value);
    onChange?.(field.fieldKey, value);
  }

  if (editing) {
    return <CustomFieldInput field={field} value={localValue} onChange={update} compact={compact} />;
  }

  return <CustomFieldDisplay field={field} value={localValue} compact={compact} />;
}

// ── Display (read-only) ──────────────────────────────────────────────────────

function CustomFieldDisplay({ field, value, compact }: { field: CustomFieldDisplay; value: CustomFieldRawValue; compact: boolean }) {
  if (value === null || value === undefined) return null;
  if (value === "" || (Array.isArray(value) && value.length === 0)) return null;

  const formatted = formatValue(field.fieldType, value);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-500">{field.label}:</span>
        <span className={cn("font-medium", getValueColor(field.fieldType, value))}>{formatted}</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{field.label}</p>
      <p className={cn("text-sm", getValueColor(field.fieldType, value))}>{formatted}</p>
    </div>
  );
}

// ── Input (editing) ──────────────────────────────────────────────────────────

function CustomFieldInput({ field, value, onChange, compact }: { field: CustomFieldDisplay; value: CustomFieldRawValue; onChange: (v: CustomFieldRawValue) => void; compact: boolean }) {
  const base = "w-full text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  switch (field.fieldType) {
    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={cn("text-sm", compact ? "text-gray-700" : "font-medium text-gray-700")}>{field.label}</span>
        </label>
      );

    case "number":
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <input type="number" value={value as number ?? ""} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.label} className={cn(base, "px-3 py-2")} />
        </div>
      );

    case "date":
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <input type="date" value={value ? (value as string).split("T")[0] : ""} onChange={(e) => onChange(e.target.value || null)}
            className={cn(base, "px-3 py-2")} />
        </div>
      );

    case "select":
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}
            className={cn(base, "px-3 py-2 bg-white cursor-pointer")}>
            <option value="">— {field.label} —</option>
            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );

    case "multiselect":
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <div className="flex flex-wrap gap-1.5">
            {field.options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <button key={opt} type="button"
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(selected ? current.filter(v => v !== opt) : [...current, opt]);
                  }}
                  className={cn("text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all",
                    selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400")}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "textarea":
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.label} rows={compact ? 2 : 4}
            className={cn(base, "px-3 py-2 resize-y")} />
        </div>
      );

    default: // text
      return (
        <div>
          {!compact && <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>}
          <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)}
            placeholder={field.label} className={cn(base, "px-3 py-2")} />
        </div>
      );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(fieldType: string, value: CustomFieldRawValue): string {
  if (value === null || value === undefined) return "—";
  if (fieldType === "boolean") return value ? "Yes" : "No";
  if (fieldType === "date") return new Date(value as string).toLocaleDateString();
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function getValueColor(fieldType: string, value: CustomFieldRawValue): string {
  if (fieldType === "boolean") return value ? "text-emerald-600 font-medium" : "text-gray-500";
  return "text-gray-900";
}

// ── Custom Fields Panel (for contact detail page) ─────────────────────────────

interface PanelProps {
  contactId: string;
  campaignId: string;
  fields: CustomFieldDisplay[];
  editable?: boolean;
  onSave?: () => void;
}

export function CustomFieldsPanel({ contactId, campaignId, fields, editable = false, onSave }: PanelProps) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Record<string, CustomFieldRawValue>>({});
  const [saving, setSaving] = useState(false);

  if (fields.length === 0) return null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/custom-field-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, campaignId, fields: pending }),
      });
      if (res.ok) {
        setEditing(false);
        setPending({});
        onSave?.();
      }
    } finally { setSaving(false); }
  }

  const displayFields = fields.filter(f => f.value !== null || editing);

  if (displayFields.length === 0 && !editable) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign Fields</h4>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setPending({}); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={save} disabled={saving} className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
      <div className={editing ? "space-y-3" : "space-y-2"}>
        {fields.map(field => (
          <CustomFieldRenderer
            key={field.fieldId}
            field={{ ...field, value: pending[field.fieldKey] !== undefined ? pending[field.fieldKey] : field.value }}
            editing={editing}
            onChange={(key, value) => setPending(prev => ({ ...prev, [key]: value }))}
          />
        ))}
      </div>
    </div>
  );
}

// ── Canvass Card Custom Fields (compact, on-card inline editing) ───────────────

interface CardFieldsProps {
  contactId: string;
  campaignId: string;
  fields: CustomFieldDisplay[];
}

export function CanvassCardCustomFields({ contactId, campaignId, fields }: CardFieldsProps) {
  const [values, setValues] = useState<Record<string, CustomFieldRawValue>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const cardFields = fields.filter(f => f.showOnCard);
  if (cardFields.length === 0) return null;

  function handleChange(key: string, value: CustomFieldRawValue) {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function autoSave() {
    if (!dirty || Object.keys(values).length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/custom-field-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, campaignId, fields: values }),
      });
      setDirty(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-2.5" onBlur={autoSave}>
      {cardFields.map(field => (
        <CustomFieldRenderer
          key={field.fieldId}
          field={{ ...field, value: values[field.fieldKey] !== undefined ? values[field.fieldKey] : field.value }}
          editing
          onChange={handleChange}
          compact
        />
      ))}
      {saving && <p className="text-xs text-gray-400">Saving…</p>}
    </div>
  );
}
