"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Phone, Mail, MapPin, Flag, MessageSquare, CheckSquare, Sparkles, Save, X } from "lucide-react";
import { Button, Card, CardHeader, CardContent, SupportLevelBadge, Badge, FormField, Input, Select, Textarea, Checkbox, Modal } from "@/components/ui";
import { fullName, formatDate, formatDateTime, formatPhone, cn } from "@/lib/utils";
import { SUPPORT_LEVEL_LABELS, INTERACTION_TYPE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, COMMON_ISSUES, SupportLevel, InteractionType } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { useForm } from "react-hook-form";
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

interface Props {
  contact: Contact;
  userRole: string;
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  tags: { id: string; campaignId: string; createdAt: Date; name: string; color: string }[];
  customFields: unknown[];
  activityLogs: { id: string; action: string; details: unknown; createdAt: string | Date; user: { id: string; name: string | null } }[];
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

export default function ContactDetailClient({ contact: initialContact, userRole, campaignId, teamMembers, activityLogs }: Props) {
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
  const [editForm, setEditForm] = useState({
    notes: contact.notes ?? "",
    supportLevel: contact.supportLevel,
    followUpNeeded: contact.followUpNeeded,
    signRequested: contact.signRequested,
    volunteerInterest: contact.volunteerInterest,
    doNotContact: contact.doNotContact,
  });

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (res.ok) { const data = await res.json(); setContact({ ...contact, ...data.data }); setEditing(false); toast.success("Contact updated"); }
      else toast.error("Failed to update contact");
    } finally { setSaving(false); }
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
                  <FormField label="Support Level">
                    <Select value={editForm.supportLevel} onChange={(e) => setEditForm({ ...editForm, supportLevel: e.target.value as SupportLevel })}>
                      {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Notes">
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={4} />
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

function LogInteractionModal({ open, onClose, contactId, contactName, onLogged }: {
  open: boolean; onClose: () => void; contactId: string; contactName: string;
  onLogged: (i: any) => void;
}) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateInteractionInput>({
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
        <FormField label="Notes"><Textarea {...register("notes")} placeholder="What happened at the door / on the call…" rows={4} /></FormField>
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
