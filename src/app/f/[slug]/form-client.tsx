"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;
  required: boolean;
  options: { value: string; label: string }[] | null;
  width: string;
  content: string | null;
  showIf: { fieldId: string; operator: string; value: string } | null;
}

interface FormData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  primaryColour: string;
  logoUrl: string | null;
  campaignName: string;
  successMessage: string;
  successRedirectUrl: string | null;
  allowMultiple: boolean;
  fields: FormField[];
}

export default function PublicFormClient({ form }: { form: FormData }) {
  const [values, setValues] = useState<Record<string, string | string[] | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setValue = useCallback((fieldId: string, value: string | string[] | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
  }, []);

  const shouldShow = useCallback((field: FormField): boolean => {
    if (!field.showIf) return true;
    const depValue = values[field.showIf.fieldId];
    switch (field.showIf.operator) {
      case "equals": return depValue === field.showIf.value;
      case "not_equals": return depValue !== field.showIf.value;
      case "not_empty": return !!depValue;
      case "contains": return typeof depValue === "string" && depValue.includes(field.showIf.value);
      default: return true;
    }
  }, [values]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    for (const field of form.fields) {
      if (!shouldShow(field)) continue;
      if (field.required) {
        const val = values[field.id];
        if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = "This field is required";
        }
      }
      if (field.type === "email" && values[field.id]) {
        const email = String(values[field.id]);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors[field.id] = "Please enter a valid email";
      }
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/forms/${form.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Submission failed" }));
        setErrors({ _form: err.error || "Something went wrong. Please try again." });
      } else {
        setSubmitted(true);
        if (form.successRedirectUrl) {
          setTimeout(() => { window.location.href = form.successRedirectUrl!; }, 2000);
        }
      }
    } catch {
      setErrors({ _form: "Network error. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${form.primaryColour}08, ${form.primaryColour}15)` }}>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{form.successMessage}</h2>
          {form.successRedirectUrl && <p className="text-sm text-gray-500 mt-4">Redirecting...</p>}
          {form.allowMultiple && (
            <button onClick={() => { setSubmitted(false); setValues({}); }} className="mt-6 text-sm font-medium underline" style={{ color: form.primaryColour }}>
              Submit another response
            </button>
          )}
          <p className="text-xs text-gray-400 mt-8">Powered by Poll City</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${form.primaryColour}05, ${form.primaryColour}12)` }}>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          {form.logoUrl && (
            <div className="mb-4 flex justify-center">
              <Image src={form.logoUrl} alt={form.campaignName} width={64} height={64} className="rounded-xl" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && <p className="text-lg text-gray-600 max-w-xl mx-auto">{form.description}</p>}
          <p className="text-sm text-gray-400 mt-2">{form.campaignName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 space-y-6">
          {errors._form && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{errors._form}</div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-6">
            {form.fields.map((field) => {
              if (!shouldShow(field)) return null;
              const widthClass = field.width === "half" ? "w-full sm:w-[calc(50%-0.5rem)]" : field.width === "third" ? "w-full sm:w-[calc(33.33%-0.67rem)]" : "w-full";

              // Layout fields
              if (field.type === "heading") return <div key={field.id} className="w-full pt-4"><h2 className="text-xl font-semibold text-gray-900">{field.label}</h2></div>;
              if (field.type === "paragraph") return <div key={field.id} className="w-full"><p className="text-gray-600 text-sm leading-relaxed">{field.content || field.label}</p></div>;
              if (field.type === "divider") return <div key={field.id} className="w-full"><hr className="border-gray-200" /></div>;

              return (
                <div key={field.id} className={widthClass}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>

                  {/* Text / Email / Phone / Number / Date */}
                  {["text", "email", "phone", "number", "date", "name", "address", "postal_code"].includes(field.type) && (
                    <input
                      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={(values[field.id] as string) || ""}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      placeholder={field.placeholder || ""}
                      className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${errors[field.id] ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"}`}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === "textarea" && (
                    <textarea
                      value={(values[field.id] as string) || ""}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      placeholder={field.placeholder || ""}
                      rows={4}
                      className={`w-full rounded-lg border px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 transition-colors ${errors[field.id] ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"}`}
                    />
                  )}

                  {/* Select / Dropdown */}
                  {field.type === "select" && (
                    <select
                      value={(values[field.id] as string) || ""}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      className={`w-full rounded-lg border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${errors[field.id] ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"}`}
                    >
                      <option value="">{field.placeholder || "Select..."}</option>
                      {field.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  )}

                  {/* Radio / Single Choice */}
                  {field.type === "radio" && (
                    <div className="space-y-2 mt-1">
                      {field.options?.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name={field.id} value={opt.value} checked={values[field.id] === opt.value} onChange={() => setValue(field.id, opt.value)}
                            className="w-4 h-4 border-gray-300" style={{ accentColor: form.primaryColour }} />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox / Multiple Choice / Multiselect */}
                  {(field.type === "multiselect" || field.type === "checkbox") && field.options && (
                    <div className="space-y-2 mt-1">
                      {field.options.map((opt) => {
                        const selected = Array.isArray(values[field.id]) ? (values[field.id] as string[]).includes(opt.value) : false;
                        return (
                          <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={selected}
                              onChange={() => {
                                const current = Array.isArray(values[field.id]) ? [...(values[field.id] as string[])] : [];
                                setValue(field.id, selected ? current.filter((v) => v !== opt.value) : [...current, opt.value]);
                              }}
                              className="w-4 h-4 rounded border-gray-300" style={{ accentColor: form.primaryColour }} />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Single Checkbox (consent, boolean) */}
                  {field.type === "consent" && (
                    <label className="flex items-start gap-3 cursor-pointer mt-1">
                      <input type="checkbox" checked={!!values[field.id]} onChange={(e) => setValue(field.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 mt-0.5" style={{ accentColor: form.primaryColour }} />
                      <span className="text-sm text-gray-700 leading-snug">{field.label}</span>
                    </label>
                  )}

                  {/* Rating */}
                  {field.type === "rating" && (
                    <div className="flex gap-2 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setValue(field.id, String(star))}
                          className={`text-3xl transition-transform hover:scale-110 ${Number(values[field.id]) >= star ? "text-yellow-400" : "text-gray-300"}`}>
                          ★
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hidden field */}
                  {field.type === "hidden" && <input type="hidden" value={field.defaultValue || ""} />}

                  {/* Help text */}
                  {field.helpText && field.type !== "consent" && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}

                  {/* Error */}
                  {errors[field.id] && <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-4 text-base font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: form.primaryColour }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <a href="https://poll.city" className="underline hover:text-gray-600">Poll City</a> 🍁
        </p>
      </div>
    </div>
  );
}
