"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle,
  MapPin, Phone, Users, Send, Play, Ban, SkipForward,
  Home, SignpostBig, BookOpen, DoorOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal, FormField, Select, Textarea, Spinner } from "@/components/ui";
import { toast } from "sonner";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssignmentType = "canvass" | "lit_drop" | "sign_install" | "sign_remove";
type AssignmentStatus = "draft" | "published" | "assigned" | "in_progress" | "completed" | "cancelled" | "reassigned";
type StopStatus = "pending" | "completed" | "skipped" | "exception" | "not_home" | "no_access";

interface Stop {
  id: string;
  order: number;
  status: StopStatus;
  outcome: Record<string, unknown> | null;
  exceptionType: string | null;
  exceptionNotes: string | null;
  notes: string | null;
  completedAt: string | null;
  completedBy: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string; address1: string | null; city: string | null; postalCode: string | null; phone: string | null; supportLevel: string; doNotContact: boolean } | null;
  household: { id: string; address1: string; city: string | null; postalCode: string | null } | null;
  sign: { id: string; address1: string; city: string | null; postalCode: string | null; status: string; signType: string } | null;
}

interface Assignment {
  id: string;
  name: string;
  description: string | null;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  printPacketUrl: string | null;
  createdBy: { id: string; name: string };
  assignedUser: { id: string; name: string } | null;
  assignedGroup: { id: string; name: string } | null;
  fieldUnit: { id: string; name: string; ward: string | null } | null;
  stops: Stop[];
  resourcePackage: Record<string, unknown> | null;
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<AssignmentType, React.ReactNode> = {
  canvass:      <DoorOpen className="h-4 w-4" />,
  lit_drop:     <BookOpen className="h-4 w-4" />,
  sign_install: <SignpostBig className="h-4 w-4" />,
  sign_remove:  <SignpostBig className="h-4 w-4" />,
};

const TYPE_LABEL: Record<AssignmentType, string> = {
  canvass: "Canvass", lit_drop: "Lit Drop",
  sign_install: "Sign Install", sign_remove: "Sign Remove",
};

const STATUS_META: Record<AssignmentStatus, { label: string; badge: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", badge: "default" },
  published: { label: "Published", badge: "info" },
  assigned: { label: "Assigned", badge: "warning" },
  in_progress: { label: "In Progress", badge: "warning" },
  completed: { label: "Completed", badge: "success" },
  cancelled: { label: "Cancelled", badge: "danger" },
  reassigned: { label: "Reassigned", badge: "info" },
};

const STOP_STATUS_META: Record<StopStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending:   { label: "Pending",   icon: <Clock className="h-3.5 w-3.5" />,         color: "text-gray-400" },
  completed: { label: "Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" />,  color: "text-green-500" },
  skipped:   { label: "Skipped",   icon: <SkipForward className="h-3.5 w-3.5" />,   color: "text-gray-400" },
  exception: { label: "Exception", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-500" },
  not_home:  { label: "Not Home",  icon: <Home className="h-3.5 w-3.5" />,          color: "text-amber-500" },
  no_access: { label: "No Access", icon: <Ban className="h-3.5 w-3.5" />,           color: "text-red-400" },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  assignment: Assignment;
  teamMembers: { id: string; name: string }[];
  campaignId: string;
}

export default function AssignmentDetailClient({ assignment: initial, teamMembers, campaignId }: Props) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment>(initial);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignUserId, setAssignUserId] = useState(initial.assignedUser?.id ?? "");
  const [assigning, setAssigning] = useState(false);

  const stops = assignment.stops;
  const total = stops.length;
  const done  = stops.filter((s) => s.status !== "pending").length;
  const completedCount = stops.filter((s) => s.status === "completed").length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Status transitions ────────────────────────────────────────────────────

  const transition = useCallback(async (action: string, extra?: Record<string, string>) => {
    setActioning(true);
    try {
      const res = await fetch(`/api/field-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setAssignment((prev) => ({ ...prev, ...data.data, stops: prev.stops }));
      toast.success(`Assignment ${action}ed`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActioning(false);
    }
  }, [assignment.id]);

  const handleAssignSubmit = useCallback(async () => {
    if (!assignUserId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/field-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", assignedUserId: assignUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAssignment((prev) => ({ ...prev, ...data.data, stops: prev.stops }));
      setShowAssign(false);
      toast.success(`Assigned to ${teamMembers.find((m) => m.id === assignUserId)?.name}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAssigning(false);
    }
  }, [assignment.id, assignUserId, teamMembers]);

  // ── Render ────────────────────────────────────────────────────────────────

  const canPublish  = assignment.status === "draft";
  const canAssign   = ["draft", "published"].includes(assignment.status);
  const canStart    = ["assigned", "published"].includes(assignment.status);
  const canComplete = assignment.status === "in_progress";
  const canCancel   = !["completed", "cancelled"].includes(assignment.status);

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Back */}
      <Link href="/field-ops" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Field Ops
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400">{TYPE_ICON[assignment.assignmentType]}</span>
            <span className="text-xs font-medium uppercase text-gray-400">{TYPE_LABEL[assignment.assignmentType]}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.name}</h1>
          {assignment.description && <p className="mt-1 text-sm text-gray-500">{assignment.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <Badge variant={STATUS_META[assignment.status].badge}>{STATUS_META[assignment.status].label}</Badge>
            {assignment.fieldUnit && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{assignment.fieldUnit.name}</span>}
            {assignment.scheduledDate && <span>{new Date(assignment.scheduledDate).toLocaleDateString("en-CA")}</span>}
            {assignment.assignedUser && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignment.assignedUser.name}</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {canPublish  && <Button size="sm" onClick={() => transition("publish")} disabled={actioning}><Send className="mr-1.5 h-3.5 w-3.5" />Publish</Button>}
          {canAssign   && <Button size="sm" variant="ghost" onClick={() => setShowAssign(true)} disabled={actioning}><Users className="mr-1.5 h-3.5 w-3.5" />Assign</Button>}
          {canStart    && <Button size="sm" onClick={() => transition("start")} disabled={actioning}><Play className="mr-1.5 h-3.5 w-3.5" />Start</Button>}
          {canComplete && <Button size="sm" onClick={() => transition("complete")} disabled={actioning}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Complete</Button>}
          {canCancel   && <Button size="sm" variant="ghost" onClick={() => { if (confirm("Cancel this assignment?")) transition("cancel"); }} disabled={actioning} className="text-red-500 hover:text-red-700"><XCircle className="mr-1.5 h-3.5 w-3.5" />Cancel</Button>}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{done} / {total} stops actioned</span>
              <span className="text-gray-500">{completedCount} completed · {pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-[#1D9E75]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
              />
            </div>
            {/* Mini status breakdown */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
              {(["pending","completed","not_home","skipped","exception","no_access"] as StopStatus[]).map((s) => {
                const n = stops.filter((st) => st.status === s).length;
                if (!n) return null;
                return (
                  <span key={s} className={`flex items-center gap-1 ${STOP_STATUS_META[s].color}`}>
                    {STOP_STATUS_META[s].icon} {n} {STOP_STATUS_META[s].label}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stop list */}
      <Card>
        <CardHeader><CardTitle>Stops ({total})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {stops.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No stops generated for this assignment.</p>
          ) : (
            <div className="divide-y">
              <AnimatePresence initial={false}>
                {stops.map((stop) => {
                  const target = stop.contact ?? stop.household ?? stop.sign;
                  const address = stop.contact?.address1 ?? stop.household?.address1 ?? stop.sign?.address1 ?? null;
                  const city = stop.contact?.city ?? stop.household?.city ?? stop.sign?.city ?? null;
                  const meta = STOP_STATUS_META[stop.status];
                  const isExpanded = expandedStop === stop.id;

                  return (
                    <motion.div
                      key={stop.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 py-3"
                    >
                      <button
                        className="flex w-full items-center gap-3 text-left"
                        onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                      >
                        <span className="w-6 shrink-0 text-xs text-gray-400 font-mono">{stop.order}</span>
                        <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {stop.contact
                              ? `${stop.contact.firstName} ${stop.contact.lastName}`
                              : address ?? `Stop ${stop.order}`}
                          </div>
                          {address && (
                            <div className="truncate text-xs text-gray-400">
                              {address}{city ? `, ${city}` : ""}
                            </div>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-300" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-300" />}
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-9 mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                              {stop.contact?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <a href={`tel:${stop.contact.phone}`} className="text-blue-600">{stop.contact.phone}</a>
                                </div>
                              )}
                              {stop.contact?.doNotContact && (
                                <div className="font-medium text-red-500">⚠ Do Not Contact</div>
                              )}
                              {stop.contact?.supportLevel && (
                                <div>Support: <span className="font-medium capitalize">{stop.contact.supportLevel.replace("_", " ")}</span></div>
                              )}
                              {stop.sign && (
                                <div>Sign type: <span className="font-medium capitalize">{stop.sign.signType}</span> · Status: <span className="font-medium capitalize">{stop.sign.status}</span></div>
                              )}
                              {stop.completedAt && (
                                <div className="text-gray-400">
                                  Actioned {new Date(stop.completedAt).toLocaleString("en-CA")}
                                  {stop.completedBy && ` by ${stop.completedBy.name}`}
                                </div>
                              )}
                              {stop.outcome && Object.keys(stop.outcome).length > 0 && (
                                <div className="rounded border border-gray-200 bg-white p-2">
                                  <div className="mb-1 font-medium text-gray-500">Outcome</div>
                                  {Object.entries(stop.outcome).map(([k, v]) => (
                                    <div key={k}><span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}:</span> {String(v)}</div>
                                  ))}
                                </div>
                              )}
                              {stop.exceptionType && (
                                <div className="text-red-500">Exception: <span className="font-medium capitalize">{stop.exceptionType.replace(/_/g, " ")}</span>
                                  {stop.exceptionNotes && ` — ${stop.exceptionNotes}`}
                                </div>
                              )}
                              {stop.notes && <div className="text-gray-500 italic">"{stop.notes}"</div>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Assign Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Assignment" size="sm">
        <div className="space-y-4">
          <FormField label="Assign To" required>
            <Select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
              <option value="">Select team member</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssignSubmit} disabled={assigning || !assignUserId}>
              {assigning ? <Spinner className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
