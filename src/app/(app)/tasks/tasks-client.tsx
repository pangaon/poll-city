"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, CheckCircle, Clock, ChevronRight, X, Pencil, Trash2, UserCircle2, CalendarDays, AlignLeft, AlertCircle } from "lucide-react";
import { Button, Modal, FormField, Input, Textarea, EmptyState, TeamMemberAutocomplete } from "@/components/ui";
import { formatDate, fullName, cn } from "@/lib/utils";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TaskStatus, TaskPriority } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, CreateTaskInput } from "@/lib/validators";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: { id: string; name: string | null; email: string | null } | null;
  createdBy: { id: string; name: string | null };
  contact: { id: string; firstName: string; lastName: string } | null;
}

interface Props {
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  currentUserId: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function TasksClient({ campaignId, teamMembers, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ campaignId, pageSize: "100" });
      if (statusFilter === "active") {
        // fetch pending + in_progress together
        const [r1, r2] = await Promise.all([
          fetch(`/api/tasks?${new URLSearchParams({ campaignId, status: "pending", pageSize: "100" })}`),
          fetch(`/api/tasks?${new URLSearchParams({ campaignId, status: "in_progress", pageSize: "100" })}`),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        setTasks([...(d1.data ?? []), ...(d2.data ?? [])]);
        setTotal((d1.total ?? 0) + (d2.total ?? 0));
      } else {
        if (statusFilter !== "all") p.set("status", statusFilter);
        const res = await fetch(`/api/tasks?${p}`);
        const data = await res.json();
        setTasks(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Keep selected task in sync after reload
  useEffect(() => {
    if (selectedTask) {
      const refreshed = tasks.find(t => t.id === selectedTask.id);
      if (refreshed) setSelectedTask(refreshed);
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { data } = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      if (selectedTask?.id === id) setSelectedTask(prev => prev ? { ...prev, ...data } : prev);
      return true;
    }
    toast.error("Update failed");
    return false;
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTask?.id === id) setSelectedTask(null);
      toast.success("Task removed");
    } else {
      toast.error("Failed to remove task");
    }
  }

  const filteredTasks = assigneeFilter === "all"
    ? tasks
    : assigneeFilter === "unassigned"
    ? tasks.filter(t => !t.assignedTo)
    : tasks.filter(t => t.assignedTo?.id === assigneeFilter);

  const grouped = {
    urgent: filteredTasks.filter(t => t.priority === "urgent" && t.status !== "completed"),
    high: filteredTasks.filter(t => t.priority === "high" && t.status !== "completed"),
    medium: filteredTasks.filter(t => t.priority === "medium" && t.status !== "completed"),
    low: filteredTasks.filter(t => t.priority === "low" && t.status !== "completed"),
    completed: filteredTasks.filter(t => t.status === "completed"),
  };

  const overdueCount = filteredTasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed"
  ).length;

  return (
    <div className="flex h-full gap-0">
      {/* Main list */}
      <div className={cn("flex-1 min-w-0 space-y-4 transition-all", selectedTask ? "pr-2" : "")}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-500">{total} tasks</p>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />{overdueCount} overdue
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Assignee filter */}
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All team</option>
              <option value="unassigned">Unassigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
              ))}
            </select>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" />New Task
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <CheckCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No tasks found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Create a task
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.urgent.length > 0 && (
              <TaskGroup label="🚨 Urgent" tasks={grouped.urgent} selectedId={selectedTask?.id}
                onSelect={setSelectedTask} onUpdate={updateTask} onDelete={deleteTask} />
            )}
            {grouped.high.length > 0 && (
              <TaskGroup label="🔴 High Priority" tasks={grouped.high} selectedId={selectedTask?.id}
                onSelect={setSelectedTask} onUpdate={updateTask} onDelete={deleteTask} />
            )}
            {grouped.medium.length > 0 && (
              <TaskGroup label="Medium" tasks={grouped.medium} selectedId={selectedTask?.id}
                onSelect={setSelectedTask} onUpdate={updateTask} onDelete={deleteTask} />
            )}
            {grouped.low.length > 0 && (
              <TaskGroup label="Low" tasks={grouped.low} selectedId={selectedTask?.id}
                onSelect={setSelectedTask} onUpdate={updateTask} onDelete={deleteTask} />
            )}
            {statusFilter !== "active" && grouped.completed.length > 0 && (
              <TaskGroup label="✅ Completed" tasks={grouped.completed} selectedId={selectedTask?.id}
                onSelect={setSelectedTask} onUpdate={updateTask} onDelete={deleteTask} dimmed />
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            key="detail"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-80 xl:w-96 flex-shrink-0 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 120px)", position: "sticky", top: 80 }}
          >
            <TaskDetailPanel
              task={selectedTask}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onClose={() => setSelectedTask(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        campaignId={campaignId}
        teamMembers={teamMembers}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </div>
  );
}

/* ─── Task Group ─────────────────────────────────────────────────────────── */

function TaskGroup({
  label, tasks, selectedId, onSelect, onUpdate, onDelete, dimmed,
}: {
  label: string;
  tasks: TaskItem[];
  selectedId?: string;
  onSelect: (t: TaskItem) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
  dimmed?: boolean;
}) {
  return (
    <div>
      <h3 className={cn("text-xs font-semibold uppercase tracking-wide mb-2", dimmed ? "text-gray-400" : "text-gray-500")}>
        {label} ({tasks.length})
      </h3>
      <div className="space-y-1.5">
        {tasks.map(t => (
          <TaskRow
            key={t.id}
            task={t}
            selected={t.id === selectedId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onDelete={onDelete}
            dimmed={dimmed}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Task Row ───────────────────────────────────────────────────────────── */

function TaskRow({
  task: t, selected, onSelect, onUpdate, onDelete, dimmed,
}: {
  task: TaskItem;
  selected: boolean;
  onSelect: (t: TaskItem) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
  dimmed?: boolean;
}) {
  const now = new Date();
  const due = t.dueDate ? new Date(t.dueDate) : null;
  const isOverdue = due && due < now && t.status !== "completed";
  const isDueToday = due && !isOverdue && t.status !== "completed"
    && due.toDateString() === now.toDateString();
  const isDueSoon = due && !isOverdue && !isDueToday && t.status !== "completed"
    && (due.getTime() - now.getTime()) < 48 * 60 * 60 * 1000;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
        selected
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : isOverdue ? "border-red-200 bg-red-50/40 hover:border-red-300"
          : isDueToday ? "border-amber-200 bg-amber-50/30 hover:border-amber-300"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
        dimmed && "opacity-60",
      )}
      onClick={() => onSelect(t)}
    >
      {/* Complete toggle */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onUpdate(t.id, { status: t.status === "completed" ? "pending" : "completed" }); }}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors flex items-center justify-center",
          t.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400",
        )}
      >
        {t.status === "completed" && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", t.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>
          {t.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", TASK_PRIORITY_COLORS[t.priority])}>
            {t.priority}
          </span>
          {t.contact && (
            <span className="text-xs text-blue-600 truncate">
              → {fullName(t.contact.firstName, t.contact.lastName)}
            </span>
          )}
          {t.assignedTo && (
            <span className="text-xs text-gray-400 truncate">
              {t.assignedTo.name ?? t.assignedTo.email}
            </span>
          )}
          {t.dueDate && (
            <span className={cn(
              "text-xs flex items-center gap-0.5",
              isOverdue ? "text-red-500 font-semibold" : isDueToday ? "text-amber-600 font-semibold" : isDueSoon ? "text-amber-500" : "text-gray-400"
            )}>
              <Clock className="w-3 h-3" />
              {isOverdue ? "Overdue" : isDueToday ? "Due today" : isDueSoon ? "Due soon" : formatDate(t.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className={cn("w-4 h-4 flex-shrink-0 transition-colors", selected ? "text-blue-400" : "text-gray-300 group-hover:text-gray-400")} />
    </div>
  );
}

/* ─── Task Detail Panel ──────────────────────────────────────────────────── */

function TaskDetailPanel({
  task, teamMembers, currentUserId, onUpdate, onDelete, onClose,
}: {
  task: TaskItem;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  currentUserId: string;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [descVal, setDescVal] = useState(task.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

  // Sync when task prop changes
  useEffect(() => {
    setTitleVal(task.title);
    setDescVal(task.description ?? "");
  }, [task.id, task.title, task.description]);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingDesc) descRef.current?.focus(); }, [editingDesc]);

  async function saveTitle() {
    if (titleVal.trim() && titleVal !== task.title) {
      await onUpdate(task.id, { title: titleVal.trim() });
    }
    setEditingTitle(false);
  }

  async function saveDesc() {
    if (descVal !== (task.description ?? "")) {
      await onUpdate(task.id, { description: descVal || null });
    }
    setEditingDesc(false);
  }

  return (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ backgroundColor: NAVY }}>
        <p className="text-sm font-semibold text-white">Task Detail</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-white/10 text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Status + Priority row */}
        <div className="flex gap-2">
          <select
            value={task.status}
            onChange={e => onUpdate(task.id, { status: e.target.value })}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={task.priority}
            onChange={e => onUpdate(task.id, { priority: e.target.value })}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Title</label>
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); } }}
              className="mt-1 w-full text-sm font-medium text-gray-900 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="mt-1 w-full text-left text-sm font-medium text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors flex items-start justify-between gap-2 group"
            >
              <span>{task.title}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
            </button>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />Notes
          </label>
          {editingDesc ? (
            <textarea
              ref={descRef}
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              onBlur={saveDesc}
              onKeyDown={e => { if (e.key === "Escape") { setDescVal(task.description ?? ""); setEditingDesc(false); } }}
              rows={4}
              className="mt-1 w-full text-sm text-gray-700 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add notes…"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="mt-1 w-full text-left text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors min-h-[60px] flex items-start justify-between gap-2 group"
            >
              <span className={cn(!task.description && "text-gray-300 italic")}>
                {task.description || "Add notes…"}
              </span>
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
            </button>
          )}
        </div>

        {/* Assign to */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <UserCircle2 className="w-3 h-3" />Assigned To
          </label>
          <TeamMemberAutocomplete
            teamMembers={teamMembers}
            value={task.assignedTo?.id ?? null}
            onChange={id => onUpdate(task.id, { assignedToId: id })}
            className="mt-1"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />Due Date
            {isOverdue && <span className="text-red-500 font-bold ml-1">OVERDUE</span>}
          </label>
          <input
            type="date"
            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={e => onUpdate(task.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className={cn(
              "mt-1 w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
              isOverdue ? "border-red-300 text-red-600" : "border-gray-200 text-gray-700",
            )}
          />
        </div>

        {/* Contact */}
        {task.contact && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</label>
            <a
              href={`/contacts/${task.contact.id}`}
              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-blue-600 font-medium"
            >
              {fullName(task.contact.firstName, task.contact.lastName)}
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />
            </a>
          </div>
        )}

        {/* Created by */}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          Created by {task.createdBy.name ?? "Unknown"}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        {!confirmDelete ? (
          <>
            <button
              type="button"
              onClick={() => onUpdate(task.id, { status: task.status === "completed" ? "pending" : "completed" })}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: task.status === "completed" ? AMBER : GREEN }}
            >
              <CheckCircle className="w-4 h-4" />
              {task.status === "completed" ? "Reopen" : "Complete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 border border-gray-200 text-sm font-medium text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              title="Delete this task"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <p className="text-xs text-red-600 font-medium flex-1">Remove this task?</p>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Create Task Modal ──────────────────────────────────────────────────── */

function CreateTaskModal({
  open, onClose, campaignId, teamMembers, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  onCreated: () => void;
}) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { campaignId, priority: "medium", status: "pending" },
  });

  async function onSubmit(data: CreateTaskInput) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { toast.success("Task created"); reset(); onCreated(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <FormField label="Task Title" error={errors.title?.message} required help={{ content: "A short, clear description of the action that needs to happen. One task = one action.", example: "Follow up with Jane Smith about transit concerns" }}>
          <Input {...register("title")} placeholder="e.g. Follow up with Jane Smith about transit concerns" />
        </FormField>
        <FormField label="Notes" help={{ content: "Extra context to help the assignee complete this task. Not visible to the contact.", example: "She mentioned she uses the 504 daily. Call before 6pm." }}>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Any extra context or instructions for the assignee…"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Priority" help={{ content: "How urgently this task needs to be done. Urgent tasks appear at the top of the task list in red.", example: "Urgent, High, Medium, Low" }}>
            <select {...register("priority")} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Due Date" help={{ content: "The deadline for this task. Overdue tasks are flagged in red on the task list.", tip: "Set a real deadline — it creates accountability." }}>
            <Input {...register("dueDate")} type="date" />
          </FormField>
        </div>
        <FormField label="Assign To" help={{ content: "Who on your team is responsible for completing this task. They will see it on their task list.", tip: "Unassigned tasks can get missed — assign them to someone." }}>
          <input type="hidden" {...register("assignedToId")} />
          <TeamMemberAutocomplete
            teamMembers={teamMembers}
            value={watch("assignedToId") ?? null}
            onChange={id => setValue("assignedToId", id ?? undefined)}
          />
        </FormField>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
