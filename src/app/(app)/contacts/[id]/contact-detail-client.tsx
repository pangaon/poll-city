"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Flag, MessageSquare, CheckSquare, Sparkles, Save, X } from "lucide-react";
import { Button, Card, CardHeader, CardContent, SupportLevelBadge, Badge, FormField, Input, Select, Textarea, Checkbox, Modal, WriteAssistTextarea } from "@/components/ui";
import { fullName, formatDate, formatDateTime, formatPhone, cn } from "@/lib/utils";
import { SUPPORT_LEVEL_LABELS, INTERACTION_TYPE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, COMMON_ISSUES, SupportLevel, InteractionType } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInteractionSchema, CreateInteractionInput } from "@/lib/validators";

interface Contact {
  id: string; firstName: string; lastName: string; email: string | null; phone: string | null;
  phone2: string | null; address1: string | null; address2: string | null; city: string | null;
  province: string | null; postalCode: string | null; ward: string | null; riding: string | null;
  supportLevel: SupportLevel; notes: string | null; preferredLanguage: string;
  doNotContact: boolean; signRequested: boolean; signPlaced: boolean; volunteerInterest: boolean;
  issues: string[]; lastContactedAt: string | Date | null; followUpNeeded: boolean; followUpDate: string | Date | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  interactions: { id: string; type: string; notes: string | null; supportLevel: string | null; createdAt: string | Date; user: { id: string; name: string | null } | null }[];
  tasks: { id: string; title: string; status: string; priority: string; dueDate: string | Date | null; createdAt: string | Date; assignedTo: { id: string; name: string | null } | null; createdBy: { id: string; name: string | null } }[];
}

interface CrmNote {
  id: string; body: string; noteType: string; visibility: string; isPinned: boolean;
  createdAt: string | Date; updatedAt: string | Date;
  createdBy: { id: string; name: string | null };
}

interface CrmRelationship {
  id: string; relationshipType: string; strength: number | null; notes: string | null;
  toContact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; supportLevel: string };
}

interface CrmRoleProfile {
  id: string; roleType: string; roleStatus: string; metadataJson: unknown;
  createdAt: string | Date;
}

interface CrmSupportProfile {
  id: string; supportScore: number | null; turnoutLikelihood: number | null;
  persuasionPriority: number | null; volunteerPotential: number | null; donorPotential: number | null;
  flagHighValue: boolean; flagHighPriority: boolean; flagHostile: boolean; flagDeceased: boolean;
  flagMoved: boolean; flagDuplicateRisk: boolean; flagNeedsFollowUp: boolean; flagComplianceReview: boolean;
  notes: string | null; lastAssessedAt: string | Date | null;
}

interface Props {
  contact: Contact;
  userRole: string;
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  tags: { id: string; campaignId: string; createdAt: Date; name: string; color: string }[];
  customFields: unknown[];
  activityLogs: { id: string; action: string; details: unknown; createdAt: string | Date; user: { id: string; name: string | null } }[];
  contactNotes?: CrmNote[];
  relationships?: CrmRelationship[];
  roleProfiles?: CrmRoleProfile[];
  supportProfile?: CrmSupportProfile | null;
}

type TimelineKind = "interaction" | "task" | "activity";

interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  subtitle: string;
  createdAt: Date;
  badge?: string;
}

function toDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(0);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function activityLabel(action: string, details: unknown): string {
  const d = (details ?? {}) as Record<string, unknown>;
  if (action === "logged_interaction") {
    const type = typeof d.type === "string" ? d.type.replaceAll("_", " ") : "interaction";
    return `Logged ${type}`;
  }
  if (action === "updated_support_level") {
    return "Updated support level";
  }
  if (action === "created") return "Created contact";
  return action.replaceAll("_", " ");
}

export default function ContactDetailClient({ contact: initialContact, userRole, campaignId, teamMembers, activityLogs, contactNotes: initialNotes = [], relationships = [], roleProfiles = [], supportProfile }: Props) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [editing, setEditing] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineKind, setTimelineKind] = useState<"all" | TimelineKind>("all");
  const [timelineQuery, setTimelineQuery] = useState("");
  // CRM tabs
  const [crmTab, setCrmTab] = useState<"notes" | "relationships" | "roles" | "score" | "audit">("notes");
  const [notes, setNotes] = useState<CrmNote[]>(initialNotes);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [noteVisibility, setNoteVisibility] = useState("all_members");
  const [noteSaving, setNoteSaving] = useState(false);
  const isManager = ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(userRole);
  const canViewRelationships = ["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER"].includes(userRole);
  const [editForm, setEditForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    address1: contact.address1 ?? "",
    city: contact.city ?? "",
    province: contact.province ?? "",
    postalCode: contact.postalCode ?? "",
    ward: contact.ward ?? "",
    riding: contact.riding ?? "",
    notes: contact.notes ?? "",
    supportLevel: contact.supportLevel,
    followUpNeeded: contact.followUpNeeded,
    signRequested: contact.signRequested,
    volunteerInterest: contact.volunteerInterest,
    doNotContact: contact.doNotContact,
  });

  function splitName() {
    const full = editForm.firstName.trim();
    const commaIdx = full.indexOf(",");
    if (commaIdx !== -1) {
      // "Last, First" format
      setEditForm(f => ({ ...f, lastName: full.slice(0, commaIdx).trim(), firstName: full.slice(commaIdx + 1).trim() }));
    } else {
      const spaceIdx = full.indexOf(" ");
      if (spaceIdx !== -1) {
        setEditForm(f => ({ ...f, firstName: full.slice(0, spaceIdx).trim(), lastName: full.slice(spaceIdx + 1).trim() }));
      }
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (res.ok) { const data = await res.json(); setContact({ ...contact, ...data.data }); setEditing(false); toast.success("Contact updated"); }
      else toast.error("Failed to update contact");
    } finally { setSaving(false); }
  }

  async function saveNote() {
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contact.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody.trim(), noteType, visibility: noteVisibility }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [data.data, ...prev]);
        setNoteBody("");
        toast.success("Note saved");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save note");
      }
    } finally { setNoteSaving(false); }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/crm/contacts/${contact.id}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success("Note deleted");
    } else toast.error("Failed to delete note");
  }

  async function getAISummary() {
    setAiLoading(true); setShowAI(true); setAiResult("");
    try {
      const res = await fetch("/api/ai-assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "summarize_voter", campaignId, contactId: contact.id }) });
      const data = await res.json();
      setAiResult(data.data?.text ?? "No summary available.");
    } catch { setAiResult("AI assist is unavailable. Please check your API key configuration."); }
    finally { setAiLoading(false); }
  }

  const addressLine = [contact.address1, contact.address2].filter(Boolean).join(", ");
  const cityLine = [contact.city, contact.province, contact.postalCode].filter(Boolean).join(", ");

  const timelineEntries = useMemo(() => {
    const interactions: TimelineEntry[] = contact.interactions.map((i) => ({
      id: `interaction-${i.id}`,
      kind: "interaction",
      title: INTERACTION_TYPE_LABELS[i.type as InteractionType] ?? i.type,
      subtitle: [i.notes, i.user?.name ?? "Unknown"].filter(Boolean).join(" · "),
      createdAt: toDate(i.createdAt),
      badge: i.supportLevel ?? undefined,
    }));

    const tasks: TimelineEntry[] = contact.tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "task",
      title: `Task: ${t.title}`,
      subtitle: [t.assignedTo?.name ?? "Unassigned", `status: ${t.status}`].join(" · "),
      createdAt: toDate(t.createdAt),
      badge: t.priority,
    }));

    const activity: TimelineEntry[] = activityLogs.map((a) => ({
      id: `activity-${a.id}`,
      kind: "activity",
      title: activityLabel(a.action, a.details),
      subtitle: a.user.name ?? "Unknown",
      createdAt: toDate(a.createdAt),
    }));

    return [...interactions, ...tasks, ...activity].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [contact.interactions, contact.tasks, activityLogs]);

  const filteredTimeline = useMemo(() => {
    const q = timelineQuery.trim().toLowerCase();
    return timelineEntries.filter((item) => {
      if (timelineKind !== "all" && item.kind !== timelineKind) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
    });
  }, [timelineEntries, timelineKind, timelineQuery]);

  return (
    <div className="max-w-5xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{fullName(contact.firstName, contact.lastName)}</h1>
            <SupportLevelBadge level={contact.supportLevel} />
            {contact.doNotContact && <Badge variant="danger">Do Not Contact</Badge>}
            {contact.followUpNeeded && <Badge variant="warning">Follow-up Needed</Badge>}
          </div>
          {contact.ward && <p className="text-sm text-gray-500 mt-0.5">{contact.ward} · {contact.riding}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={getAISummary}><Sparkles className="w-3.5 h-3.5" />AI Summary</Button>
          <Button size="sm" onClick={() => setShowInteraction(true)}><MessageSquare className="w-3.5 h-3.5" />Log Interaction</Button>
          {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-3.5 h-3.5" />Edit</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — profile */}
        <div className="space-y-4">
          <Card>
            <CardHeader><h3 className="font-semibold text-sm text-gray-900">Contact Info</h3></CardHeader>
            <CardContent className="space-y-3">
              {contact.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">{formatPhone(contact.phone)}</a></div>}
              {contact.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline truncate">{contact.email}</a></div>}
              {addressLine && <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /><div><div>{addressLine}</div><div className="text-gray-500">{cityLine}</div></div></div>}
              {contact.preferredLanguage !== "en" && <div className="text-sm text-gray-600">Preferred: <span className="font-medium">{contact.preferredLanguage.toUpperCase()}</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Profile</h3>
                {editing && (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveEdit} loading={saving}><Save className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <>
                  {/* Name — with split helper */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500">Name</p>
                      {editForm.firstName.includes(" ") && !editForm.lastName && (
                        <button type="button" onClick={splitName} className="text-xs text-blue-600 hover:underline">Split name →</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First name" />
                      <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="Last name" />
                    </div>
                    {editForm.firstName.includes(" ") && !editForm.lastName && (
                      <p className="text-xs text-amber-600">Looks like a full name in First Name — use Split name to fix.</p>
                    )}
                  </div>
                  <FormField label="Phone">
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="e.g. 416-555-1234" />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@example.com" />
                  </FormField>
                  <FormField label="Address">
                    <Input value={editForm.address1} onChange={(e) => setEditForm({ ...editForm, address1: e.target.value })} placeholder="123 Main St" />
                  </FormField>
                  <div className="flex gap-2">
                    <div className="flex-1"><FormField label="City"><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Toronto" /></FormField></div>
                    <div className="w-24"><FormField label="Province"><Input value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} placeholder="ON" /></FormField></div>
                    <div className="w-28"><FormField label="Postal"><Input value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} placeholder="M5V 1A1" /></FormField></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1"><FormField label="Ward"><Input value={editForm.ward} onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })} placeholder="Ward 10" /></FormField></div>
                    <div className="flex-1"><FormField label="Riding"><Input value={editForm.riding} onChange={(e) => setEditForm({ ...editForm, riding: e.target.value })} placeholder="Riding name" /></FormField></div>
                  </div>
                  <FormField label="Support Level">
                    <Select value={editForm.supportLevel} onChange={(e) => setEditForm({ ...editForm, supportLevel: e.target.value as SupportLevel })}>
                      {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Notes">
                    <WriteAssistTextarea value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} context="note" campaignId={campaignId} rows={4} />
                  </FormField>
                  <div className="space-y-2">
                    <Checkbox label="Follow-up needed" checked={editForm.followUpNeeded} onChange={(e) => setEditForm({ ...editForm, followUpNeeded: e.target.checked })} />
                    <Checkbox label="Sign requested" checked={editForm.signRequested} onChange={(e) => setEditForm({ ...editForm, signRequested: e.target.checked })} />
                    <Checkbox label="Volunteer interest" checked={editForm.volunteerInterest} onChange={(e) => setEditForm({ ...editForm, volunteerInterest: e.target.checked })} />
                    <Checkbox label="Do not contact" checked={editForm.doNotContact} onChange={(e) => setEditForm({ ...editForm, doNotContact: e.target.checked })} />
                  </div>
                </>
              ) : (
                <>
                  {contact.issues.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Issues</p>
                      <div className="flex flex-wrap gap-1">
                        {contact.issues.map((issue) => <span key={issue} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{issue}</span>)}
                      </div>
                    </div>
                  )}
                  {contact.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(({ tag }) => <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}
                      </div>
                    </div>
                  )}
                  {contact.notes && <div><p className="text-xs font-medium text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p></div>}
                  <div className="space-y-1.5 pt-1">
                    {[
                      { active: contact.signRequested, label: "Sign requested", color: "bg-orange-500" },
                      { active: contact.volunteerInterest, label: "Volunteer interest", color: "bg-blue-500" },
                      { active: contact.followUpNeeded, label: "Follow-up needed", color: "bg-amber-500" },
                    ].filter(f => f.active).map(f => (
                      <div key={f.label} className="flex items-center gap-2 text-sm"><div className={`w-2 h-2 rounded-full ${f.color}`} />{f.label}</div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 pt-1">Last contacted: {formatDate(contact.lastContactedAt)}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right columns — interactions + tasks */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Result */}
          {showAI && (
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-gray-900">AI Summary</h3>
                <button onClick={() => setShowAI(false)} className="ml-auto text-gray-400 hover:text-gray-600">&times;</button>
              </CardHeader>
              <CardContent>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500"><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Generating summary…</div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResult}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Unified Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-gray-900">Timeline ({filteredTimeline.length})</h3>
                <div className="flex items-center gap-1 flex-wrap">
                  {([
                    ["all", "All"],
                    ["interaction", "Interactions"],
                    ["task", "Tasks"],
                    ["activity", "Activity"],
                  ] as const).map(([value, label]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={timelineKind === value ? "default" : "outline"}
                      onClick={() => setTimelineKind(value)}
                      className="h-7 px-2"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                value={timelineQuery}
                onChange={(e) => setTimelineQuery(e.target.value)}
                placeholder="Search timeline notes, actions, people..."
              />
            </CardHeader>
            <CardContent className="p-0">
              {filteredTimeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No timeline events match your filters</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                  {filteredTimeline.slice(0, 120).map((entry) => (
                    <div key={entry.id} className="px-6 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                          <p className="text-xs text-gray-500 truncate">{entry.subtitle}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(entry.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="info">{entry.kind}</Badge>
                          {entry.badge ? <Badge variant="default">{entry.badge}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Interactions ({contact.interactions.length})</h3>
                <Button size="sm" variant="outline" onClick={() => setShowInteraction(true)}><MessageSquare className="w-3.5 h-3.5" />Log</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {contact.interactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No interactions yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {contact.interactions.map((i) => (
                    <div key={i.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{INTERACTION_TYPE_LABELS[i.type as InteractionType]}</span>
                            {i.supportLevel && <SupportLevelBadge level={i.supportLevel as SupportLevel} />}
                          </div>
                          {i.notes && <p className="text-sm text-gray-600 mt-1">{i.notes}</p>}
                          <p className="text-xs text-gray-400 mt-1">{i.user?.name ?? "Unknown"} · {formatDateTime(i.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Tasks ({contact.tasks.length})</h3>
                <Link href={`/tasks?contactId=${contact.id}`}><Button size="sm" variant="outline"><CheckSquare className="w-3.5 h-3.5" />View All</Button></Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {contact.tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tasks</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {contact.tasks.map((t) => (
                    <div key={t.id} className="px-6 py-3 flex items-start gap-3">
                      <div className={cn("mt-1 w-2 h-2 rounded-full flex-shrink-0", t.status === "completed" ? "bg-emerald-500" : "bg-amber-400")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", t.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</p>
                        <p className="text-xs text-gray-400">{t.assignedTo?.name ?? "Unassigned"}{t.dueDate && ` · Due ${formatDate(t.dueDate)}`}</p>
                      </div>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", TASK_PRIORITY_COLORS[t.priority as keyof typeof TASK_PRIORITY_COLORS])}>{t.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── CRM INTELLIGENCE TABS ─── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Tab strip */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {(["notes", "relationships", "roles", ...(isManager ? ["score", "audit"] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCrmTab(tab as typeof crmTab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium capitalize transition-colors",
                crmTab === tab
                  ? "bg-white border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              {tab === "score" ? "Support Score" : tab}
              {tab === "notes" && notes.length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5">{notes.length}</span>
              )}
              {tab === "relationships" && relationships.length > 0 && (
                <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 rounded-full px-1.5">{relationships.length}</span>
              )}
              {tab === "roles" && roleProfiles.length > 0 && (
                <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5">{roleProfiles.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Notes */}
        {crmTab === "notes" && (
          <div className="p-4 space-y-3">
            {/* Note composer */}
            <div className="space-y-2">
              <WriteAssistTextarea
                value={noteBody}
                onChange={setNoteBody}
                context="note"
                campaignId={campaignId}
                placeholder="Add a note about this contact…"
                className="border border-gray-200 min-h-[72px]"
                rows={3}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="border border-gray-200 rounded text-xs px-2 py-1"
                >
                  {["general", "call", "canvass", "email", "event", "complaint"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {isManager && (
                  <select
                    value={noteVisibility}
                    onChange={(e) => setNoteVisibility(e.target.value)}
                    className="border border-gray-200 rounded text-xs px-2 py-1"
                  >
                    <option value="all_members">All members</option>
                    <option value="managers_only">Managers only</option>
                    <option value="admin_only">Admin only</option>
                  </select>
                )}
                <Button size="sm" onClick={saveNote} loading={noteSaving} disabled={!noteBody.trim()}>
                  Save Note
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No notes yet. Add the first one above.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notes.map((note) => (
                  <div key={note.id} className={cn(
                    "py-3",
                    note.visibility === "admin_only" ? "border-l-2 border-red-300 pl-3" :
                    note.visibility === "managers_only" ? "border-l-2 border-amber-300 pl-3" : ""
                  )}>
                    {note.isPinned && <span className="text-xs font-medium text-blue-600 mb-1 block">📌 Pinned</span>}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{note.noteType}</span>
                      {note.visibility !== "all_members" && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{note.visibility.replace("_", " ")}</span>
                      )}
                      <span className="text-xs text-gray-400">{note.createdBy.name ?? "Unknown"} · {formatDate(note.createdAt)}</span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="ml-auto text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Relationships */}
        {crmTab === "relationships" && canViewRelationships && (
          <div className="p-4">
            {relationships.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No relationships mapped yet.</p>
                <p className="text-xs text-gray-400 mt-1">Use the API to add connections — full UI coming in Phase 5.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <div key={rel.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <a href={`/contacts/${rel.toContact.id}`} className="hover:text-blue-600">
                          {rel.toContact.firstName} {rel.toContact.lastName}
                        </a>
                      </p>
                      <p className="text-xs text-gray-500">{rel.relationshipType.replace(/_/g, " ")}</p>
                      {rel.notes && <p className="text-xs text-gray-400 mt-0.5">{rel.notes}</p>}
                    </div>
                    <SupportLevelBadge level={rel.toContact.supportLevel as SupportLevel} />
                    {rel.strength && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={cn("w-2 h-2 rounded-full", i <= rel.strength! ? "bg-blue-500" : "bg-gray-200")} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Roles */}
        {crmTab === "roles" && (
          <div className="p-4">
            {roleProfiles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No roles assigned. Add via the API or the role manager (Phase 5).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roleProfiles.map((rp) => (
                  <div key={rp.id} className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                    rp.roleStatus === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                    rp.roleStatus === "inactive" ? "bg-gray-50 border-gray-200 text-gray-500" :
                    "bg-amber-50 border-amber-200 text-amber-800"
                  )}>
                    <span className="font-medium capitalize">{rp.roleType.replace(/_/g, " ")}</span>
                    <span className="text-xs opacity-70">({rp.roleStatus})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Support Score — managers only */}
        {crmTab === "score" && isManager && (
          <div className="p-4">
            {!supportProfile ? (
              <p className="text-sm text-gray-400 text-center py-6">No support profile yet. Visit the contact's score API to initialize.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Support Score", value: supportProfile.supportScore, color: "bg-blue-500" },
                  { label: "Turnout Likelihood", value: supportProfile.turnoutLikelihood, color: "bg-emerald-500" },
                  { label: "Persuasion Priority", value: supportProfile.persuasionPriority, color: "bg-amber-500" },
                  { label: "Volunteer Potential", value: supportProfile.volunteerPotential, color: "bg-purple-500" },
                  { label: "Donor Potential", value: supportProfile.donorPotential, color: "bg-orange-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-2 rounded-full", color)}
                          style={{ width: `${value ?? 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{value ?? "—"}</span>
                    </div>
                  </div>
                ))}
                <div className="col-span-full">
                  <p className="text-xs font-medium text-gray-500 mb-2">Flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { flag: supportProfile.flagHighValue, label: "High Value", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
                      { flag: supportProfile.flagHighPriority, label: "High Priority", color: "bg-blue-100 text-blue-800 border-blue-300" },
                      { flag: supportProfile.flagHostile, label: "Hostile", color: "bg-red-100 text-red-800 border-red-300" },
                      { flag: supportProfile.flagDeceased, label: "Deceased", color: "bg-gray-100 text-gray-700 border-gray-400" },
                      { flag: supportProfile.flagMoved, label: "Moved", color: "bg-orange-100 text-orange-800 border-orange-300" },
                      { flag: supportProfile.flagDuplicateRisk, label: "Duplicate Risk", color: "bg-purple-100 text-purple-800 border-purple-300" },
                      { flag: supportProfile.flagNeedsFollowUp, label: "Needs Follow-Up", color: "bg-amber-100 text-amber-800 border-amber-300" },
                      { flag: supportProfile.flagComplianceReview, label: "Compliance Review", color: "bg-rose-100 text-rose-800 border-rose-300" },
                    ].filter(f => f.flag).map(({ label, color }) => (
                      <span key={label} className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", color)}>{label}</span>
                    ))}
                    {!Object.values({
                      a: supportProfile.flagHighValue, b: supportProfile.flagHighPriority,
                      c: supportProfile.flagHostile, d: supportProfile.flagDeceased,
                      e: supportProfile.flagMoved, f: supportProfile.flagDuplicateRisk,
                      g: supportProfile.flagNeedsFollowUp, h: supportProfile.flagComplianceReview,
                    }).some(Boolean) && (
                      <span className="text-xs text-gray-400">No flags set</span>
                    )}
                  </div>
                </div>
                {supportProfile.lastAssessedAt && (
                  <p className="text-xs text-gray-400 col-span-full">
                    Last assessed: {formatDate(supportProfile.lastAssessedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Audit — managers only */}
        {crmTab === "audit" && isManager && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-3">Field-level audit log for this contact.</p>
            <AuditLogPanel contactId={contact.id} />
          </div>
        )}
      </div>

      {/* Log Interaction Modal */}
      <LogInteractionModal
        open={showInteraction}
        onClose={() => setShowInteraction(false)}
        contactId={contact.id}
        contactName={fullName(contact.firstName, contact.lastName)}
        onLogged={(interaction) => {
          setContact((prev) => ({ ...prev, interactions: [interaction, ...prev.interactions], lastContactedAt: new Date().toISOString() }));
          setShowInteraction(false);
        }}
      />
    </div>
  );
}

// ── CASL Consent Tab ─────────────────────────────────────────────────────────

type ConsentChannel = "email" | "sms" | "push";
type ConsentType = "explicit" | "implied" | "express_withdrawal";
type ConsentSource = "import" | "form" | "qr" | "manual" | "social_follow" | "donation" | "event_signup";

interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  channel: ConsentChannel;
  source: ConsentSource;
  collectedAt: string;
  expiresAt: string | null;
  ipAddress: string | null;
  notes: string | null;
  createdAt: string;
  recordedBy: { id: string; name: string | null } | null;
}

interface ConsentSummaryEntry {
  hasConsent: boolean;
  activeType: ConsentType | null;
  expiresAt: string | null;
}

const CHANNEL_LABELS: Record<ConsentChannel, string> = { email: "Email", sms: "SMS", push: "Push" };
const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  explicit: "Explicit",
  implied: "Implied",
  express_withdrawal: "Withdrawn",
};
const SOURCE_LABELS: Record<ConsentSource, string> = {
  import: "CSV Import",
  form: "Web Form",
  qr: "QR Capture",
  manual: "Manual Entry",
  social_follow: "Social Follow",
  donation: "Donation",
  event_signup: "Event Sign-up",
};

function ConsentTab({ contactId, campaignId }: { contactId: string; campaignId: string }) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [summary, setSummary] = useState<Record<ConsentChannel, ConsentSummaryEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    consentType: ConsentType;
    channel: ConsentChannel;
    source: ConsentSource;
    notes: string;
  }>({ consentType: "explicit", channel: "email", source: "manual", notes: "" });

  function load() {
    setLoading(true);
    fetch(`/api/compliance/consent?contactId=${contactId}&campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d.records ?? []); setSummary(d.summary ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [contactId, campaignId]);

  async function saveConsent() {
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, campaignId, ...form, collectedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        toast.success("Consent recorded");
        setAdding(false);
        load();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to record consent");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-6 text-sm text-gray-400"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Loading consent history…</div>;
  }

  const channels: ConsentChannel[] = ["email", "sms", "push"];

  return (
    <div className="space-y-4">
      {/* CASL explanation — empty state */}
      {records.length === 0 && !adding && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">No consent records for this contact</p>
          <p className="text-sm text-amber-700">
            Under Canada&rsquo;s Anti-Spam Legislation (CASL), you need documented consent before sending commercial
            electronic messages. Add a consent record to include this contact in email or SMS blasts.
          </p>
          <p className="text-sm text-amber-700 mt-1">
            <strong>Explicit consent</strong> never expires. <strong>Implied consent</strong> from an existing business
            relationship expires after 2 years. <strong>Express withdrawal</strong> permanently blocks all outbound
            messages on that channel.
          </p>
        </div>
      )}

      {/* Per-channel status summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {channels.map((ch) => {
            const s = summary[ch];
            return (
              <div key={ch} className={cn(
                "rounded-lg border p-3 text-center",
                s.activeType === "express_withdrawal"
                  ? "bg-red-50 border-red-200"
                  : s.hasConsent
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200",
              )}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{CHANNEL_LABELS[ch]}</p>
                <p className={cn(
                  "text-sm font-medium mt-0.5",
                  s.activeType === "express_withdrawal" ? "text-red-700" : s.hasConsent ? "text-green-700" : "text-gray-400",
                )}>
                  {s.activeType === "express_withdrawal"
                    ? "Withdrawn"
                    : s.hasConsent
                    ? CONSENT_TYPE_LABELS[s.activeType!]
                    : "No Consent"}
                </p>
                {s.expiresAt && (
                  <p className="text-xs text-gray-400 mt-0.5">Exp. {formatDate(s.expiresAt)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add consent button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Record consent event
        </button>
      )}

      {/* Add consent form */}
      {adding && (
        <div className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
          <p className="text-sm font-medium text-blue-900">Record Consent Event</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={form.consentType}
                onChange={(e) => setForm((f) => ({ ...f, consentType: e.target.value as ConsentType }))}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="explicit">Explicit (written opt-in)</option>
                <option value="implied">Implied (business relationship)</option>
                <option value="express_withdrawal">Express Withdrawal (opt-out)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as ConsentChannel }))}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as ConsentSource }))}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                {(Object.entries(SOURCE_LABELS) as [ConsentSource, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Door canvass on 2026-04-19, signed paper form"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveConsent}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Consent history */}
      {records.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">History ({records.length})</p>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {records.map((rec) => (
              <div key={rec.id} className="px-3 py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded",
                      rec.consentType === "express_withdrawal"
                        ? "bg-red-100 text-red-700"
                        : rec.consentType === "explicit"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700",
                    )}>
                      {CONSENT_TYPE_LABELS[rec.consentType]}
                    </span>
                    <span className="text-xs text-gray-500">{CHANNEL_LABELS[rec.channel]}</span>
                    <span className="text-xs text-gray-400">via {SOURCE_LABELS[rec.source]}</span>
                  </div>
                  {rec.notes && <p className="text-xs text-gray-500 mt-0.5">{rec.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(rec.collectedAt)}
                    {rec.expiresAt && ` · expires ${formatDate(rec.expiresAt)}`}
                    {rec.recordedBy && ` · by ${rec.recordedBy.name ?? "unknown"}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  oldValueJson: unknown;
  newValueJson: unknown;
  source: string;
  createdAt: string;
  actorName: string | null;
}

function AuditLogPanel({ contactId }: { contactId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/crm/contacts/${contactId}/audit?page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => { setLogs(d.data ?? []); setTotal(d.total ?? 0); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [contactId, page]);

  if (loading) {
    return <div className="flex items-center gap-2 py-4 text-sm text-gray-400"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Loading audit log…</div>;
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No audit entries for this contact yet.</p>;
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-2">
      <div className="divide-y divide-gray-100">
        {logs.map((entry) => {
          const newVal = (entry.newValueJson ?? {}) as Record<string, unknown>;
          const oldVal = (entry.oldValueJson ?? {}) as Record<string, unknown>;
          const changedField = Object.keys(newVal).find(k => k !== "absorbedId" && k !== "fieldDecisions");
          return (
            <div key={entry.id} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-700 capitalize">{entry.action.replace(/_/g, " ")}</span>
                  {changedField && (
                    <span className="text-xs text-gray-500 ml-1.5">
                      · <span className="font-mono">{changedField}</span>
                      {oldVal[changedField] !== undefined && (
                        <span> {String(oldVal[changedField])} → {String(newVal[changedField])}</span>
                      )}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.actorName ?? "System"} · {entry.source} · {formatDate(entry.createdAt)}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{entry.entityType}</span>
              </div>
            </div>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
          <span>{total} total entries</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
            <span className="px-2 py-1">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogInteractionModal({ open, onClose, contactId, contactName, onLogged }: {
  open: boolean; onClose: () => void; contactId: string; contactName: string;
  onLogged: (i: any) => void;
}) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CreateInteractionInput>({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: { contactId, type: InteractionType.note, issues: [] },
  });

  async function onSubmit(data: CreateInteractionInput) {
    const res = await fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { const r = await res.json(); toast.success("Interaction logged"); reset(); onLogged(r.data); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed to log interaction"); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Log Interaction — ${contactName}`} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("contactId")} />
        <FormField label="Interaction Type" error={errors.type?.message} required>
          <Select {...register("type")}>
            {Object.entries(INTERACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </FormField>
        <FormField label="Support Level">
          <Select {...register("supportLevel")}>
            <option value="">No change</option>
            {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </FormField>
        <FormField label="Notes">
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <WriteAssistTextarea
                value={field.value ?? ""}
                onChange={field.onChange}
                context="note"
                rows={4}
                placeholder="What happened at the door / on the call…"
              />
            )}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <Checkbox label="Sign requested" {...register("signRequested")} />
          <Checkbox label="Volunteer interest" {...register("volunteerInterest")} />
          <Checkbox label="Follow-up needed" {...register("followUpNeeded")} />
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Log Interaction</Button>
        </div>
      </form>
    </Modal>
  );
}
