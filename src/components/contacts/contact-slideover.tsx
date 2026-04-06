"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Phone, Mail, MapPin, User, Tag as TagIcon, Clock, Edit2, Save, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { SUPPORT_LEVEL_LABELS, type SupportLevel } from "@/types";

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  ward: string | null;
  pollNumber: string | null;
  supportLevel: SupportLevel;
  followUpNeeded: boolean;
  volunteerInterest: boolean;
  signRequested: boolean;
  doNotContact: boolean;
  notes: string | null;
  lastContactedAt: string | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  interactions: Array<{
    id: string;
    type: string;
    notes: string | null;
    createdAt: string;
    user: { name: string | null; email: string } | null;
  }>;
}

const SUPPORT_LEVELS: SupportLevel[] = ["strong_support", "leaning_support", "undecided", "leaning_opposition", "strong_opposition"];
const SUPPORT_LEVEL_COLOURS: Record<string, string> = {
  strong_support: "bg-emerald-500 text-white",
  leaning_support: "bg-emerald-300 text-emerald-900",
  undecided: "bg-gray-300 text-gray-900",
  leaning_opposition: "bg-orange-300 text-orange-900",
  strong_opposition: "bg-red-500 text-white",
  unknown: "bg-slate-200 text-slate-700",
};

interface Props {
  contactId: string | null;
  onClose: () => void;
  onUpdate?: (contact: { id: string; supportLevel: SupportLevel }) => void;
}

export function ContactSlideOver({ contactId, onClose, onUpdate }: Props) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to load contact");
      }
      const data = await res.json();
      const c = data.data ?? data;
      setContact(c);
      setNotes(c.notes ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load contact";
      setContact(null);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (contactId) load();
    else {
      setContact(null);
      setLoadError(null);
      setSaveError(null);
    }
  }, [contactId, load]);

  // Close on Escape key
  useEffect(() => {
    if (!contactId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [contactId, onClose]);

  async function updateField(updates: Partial<ContactDetail>) {
    if (!contact) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to save changes");
      }
      const updated = { ...contact, ...updates };
      setContact(updated);
      if (updates.supportLevel && onUpdate) {
        onUpdate({ id: contact.id, supportLevel: updates.supportLevel });
      }
      toast.success("Saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    await updateField({ notes });
    setEditingNotes(false);
  }

  function formatAddress(c: ContactDetail): string {
    const parts = [c.address1, c.address2, c.city, c.province, c.postalCode].filter(Boolean);
    return parts.join(", ") || "No address on file";
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "Never";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  }

  if (!contactId) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      {/* Slide-over */}
      <div className="ml-auto relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Contact details</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !contact ? (
          <div className="px-5 py-8">
            <div className="border border-red-200 bg-red-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-900">Unable to load contact</p>
              <p className="text-xs text-red-700 mt-1">{loadError ?? "The contact could not be loaded."}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { void load(); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-800 hover:bg-red-100"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {saveError && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-900">Save failed</p>
                <p className="text-xs text-amber-800 mt-0.5">{saveError}</p>
              </div>
            )}

            {/* Name + Support Level */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h3>
              {contact.doNotContact && (
                <p className="text-xs font-semibold text-red-600 mt-0.5">⚠ Do Not Contact</p>
              )}
            </div>

            {/* Support level selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Support level</label>
              <div className="grid grid-cols-5 gap-1">
                {SUPPORT_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => updateField({ supportLevel: level })}
                    disabled={saving}
                    className={`text-xs font-semibold py-2 px-1 rounded-lg transition-all ${
                      contact.supportLevel === level
                        ? SUPPORT_LEVEL_COLOURS[level] + " ring-2 ring-offset-1 ring-blue-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {SUPPORT_LEVEL_LABELS[level].split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">{contact.phone}</span>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900 truncate">{contact.email}</span>
                </a>
              )}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-900">{formatAddress(contact)}</p>
                  {contact.ward && (
                    <p className="text-xs text-gray-500 mt-0.5">Ward: {contact.ward}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="grid grid-cols-3 gap-2">
              <FlagToggle
                label="Follow up"
                active={contact.followUpNeeded}
                onChange={(v) => updateField({ followUpNeeded: v })}
              />
              <FlagToggle
                label="Volunteer"
                active={contact.volunteerInterest}
                onChange={(v) => updateField({ volunteerInterest: v })}
              />
              <FlagToggle
                label="Sign"
                active={contact.signRequested}
                onChange={(v) => updateField({ signRequested: v })}
              />
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5" /> Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((t) => (
                    <span
                      key={t.tag.id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: t.tag.color + "20", color: t.tag.color }}
                    >
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Notes</label>
                {editingNotes ? (
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              {editingNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about this contact..."
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg min-h-[60px]">
                  {contact.notes || <span className="text-gray-400 italic">No notes yet</span>}
                </p>
              )}
            </div>

            {/* Interaction history */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Recent activity ({contact.interactions.length})
              </label>
              {contact.interactions.length === 0 ? (
                <p className="text-sm text-gray-400 italic p-3 bg-gray-50 rounded-lg">
                  No interactions recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {contact.interactions.slice(0, 5).map((i) => (
                    <div key={i.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900 capitalize">
                          {i.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(i.createdAt)}</span>
                      </div>
                      {i.notes && <p className="text-xs text-gray-700">{i.notes}</p>}
                      {i.user && (
                        <p className="text-xs text-gray-400 mt-1">
                          by {i.user.name || i.user.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-2">
              <a
                href={`/contacts/${contact.id}`}
                className="flex-1 text-center text-sm font-semibold text-blue-600 hover:text-blue-800 py-2"
              >
                View full profile →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlagToggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`text-xs font-semibold py-2.5 rounded-lg transition-colors ${
        active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
