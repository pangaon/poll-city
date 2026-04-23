"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus, CheckCircle, Clock, ChevronRight, X, Pencil, Trash2, UserCircle2,
  CalendarDays, AlignLeft, AlertCircle, LayoutGrid, List, Zap, RefreshCw,
  ChevronDown, Flame, Link2, Sparkles, Target,
} from "lucide-react";
import { Button, Modal, FormField, Input, TeamMemberAutocomplete } from "@/components/ui";
import { formatDate, fullName, cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS, TASK_CATEGORY_ICONS, TASK_CATEGORY_COLORS,
  TASK_RESOLUTION_LABELS, TASK_RESOLUTION_ICONS,
  TaskStatus, TaskPriority, TaskCategory, TaskResolutionType,
} from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, CreateTaskInput } from "@/lib/validators";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string | null;
  completedAt: string | null;
  resolutionType: TaskResolutionType | null;
  resolutionNote: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  parentTaskId: string | null;
  parentTask: { id: string; title: string } | null;
  assignedTo: { id: string; name: string | null; email: string | null } | null;
  createdBy: { id: string; name: string | null };
  contact: { id: string; firstName: string; lastName: string; supportLevel: string | null } | null;
  _count: { followUps: number };
}

interface Props {
  campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  currentUserId: string;
}

type ViewMode = "list" | "board";
type CategoryFilter = "my" | "all" | "week" | TaskCategory;

// ─── Campaign playbook templates ──────────────────────────────────────────────

const PLAYBOOK_PHASES = [
  {
    label: "Early Campaign — First 30 Days",
    tasks: [
      { title: "Set up campaign bank account", priority: "urgent" as TaskPriority, category: "FINANCE" as TaskCategory, daysOut: 3 },
      { title: "Create campaign brand kit (logo, colours, fonts)", priority: "high" as TaskPriority, category: "COMMS" as TaskCategory, daysOut: 5 },
      { title: "Register campaign with Elections Ontario", priority: "urgent" as TaskPriority, category: "ADMIN" as TaskCategory, daysOut: 7 },
      { title: "Appoint official agent (financial agent)", priority: "urgent" as TaskPriority, category: "ADMIN" as TaskCategory, daysOut: 7 },
      { title: "Set up campaign website", priority: "high" as TaskPriority, category: "COMMS" as TaskCategory, daysOut: 14 },
      { title: "Recruit 5 core volunteers through personal network", priority: "high" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 14 },
      { title: "Recruit campaign manager", priority: "high" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 14 },
      { title: "Import voter list from Elections Ontario", priority: "urgent" as TaskPriority, category: "FIELD" as TaskCategory, daysOut: 7 },
    ],
  },
  {
    label: "Volunteer & Field Ops — 60 Days Out",
    tasks: [
      { title: "Recruit 10 core volunteers through personal network", priority: "high" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 14 },
      { title: "Set up volunteer orientation session", priority: "high" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 10 },
      { title: "Canvas main arterial streets for sign locations", priority: "high" as TaskPriority, category: "FIELD" as TaskCategory, daysOut: 21 },
      { title: "Create canvassing script for knock-and-talk", priority: "medium" as TaskPriority, category: "FIELD" as TaskCategory, daysOut: 14 },
      { title: "Design and order lawn signs (500 minimum)", priority: "urgent" as TaskPriority, category: "COMMS" as TaskCategory, daysOut: 30 },
      { title: "Create campaign budget", priority: "high" as TaskPriority, category: "FINANCE" as TaskCategory, daysOut: 14 },
      { title: "Launch fundraising ask to personal network", priority: "high" as TaskPriority, category: "FINANCE" as TaskCategory, daysOut: 21 },
    ],
  },
  {
    label: "GOTV — Final 2 Weeks",
    tasks: [
      { title: "Confirm all GOTV ride volunteers availability", priority: "urgent" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 3 },
      { title: "Final knock on all identified supporters", priority: "urgent" as TaskPriority, category: "FIELD" as TaskCategory, daysOut: 5 },
      { title: "Set up election day volunteer assignments", priority: "urgent" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 5 },
      { title: "Print poll-by-poll voter lists for scrutineers", priority: "urgent" as TaskPriority, category: "FIELD" as TaskCategory, daysOut: 3 },
      { title: "Brief all scrutineers on election day procedures", priority: "urgent" as TaskPriority, category: "VOLUNTEERS" as TaskCategory, daysOut: 2 },
      { title: "Final email blast to supporters — Vote!", priority: "urgent" as TaskPriority, category: "COMMS" as TaskCategory, daysOut: 1 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SupportChip({ level }: { level: string | null }) {
  if (!level) return null;
  const map: Record<string, string> = {
    strong_support: "💚", lean_support: "🟢", undecided: "🟡",
    lean_oppose: "🟠", strong_oppose: "🔴",
  };
  return <span title={level.replace(/_/g, " ")}>{map[level] ?? "⚪"}</span>;
}

function getDueInfo(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === "completed" || status === "cancelled") return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (diff < 0) return { label: "Overdue", color: "text-red-500 font-bold", bg: "bg-red-50/60 border-red-200", pulse: true };
  if (hours < 24) return { label: `Due in ${Math.ceil(hours)}h`, color: "text-orange-600 font-bold", bg: "bg-orange-50/60 border-orange-200", pulse: true };
  if (due.toDateString() === now.toDateString()) return { label: "Due today", color: "text-amber-600 font-semibold", bg: "bg-amber-50/60 border-amber-200", pulse: false };
  if (diff < 48 * 60 * 60 * 1000) return { label: "Due tomorrow", color: "text-amber-500", bg: "", pulse: false };
  return { label: formatDate(dueDate), color: "text-gray-400", bg: "", pulse: false };
}

function smartDateValue(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function nextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function TasksClient({ campaignId, teamMembers, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("my");
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickAddValue, setQuickAddValue] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/tasks?${new URLSearchParams({ campaignId, status: "pending", pageSize: "200" })}`).then(r => r.json()),
        fetch(`/api/tasks?${new URLSearchParams({ campaignId, status: "in_progress", pageSize: "200" })}`).then(r => r.json()),
      ]);
      setTasks([...(r1.data ?? []), ...(r2.data ?? [])]);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedTask) {
      const refreshed = tasks.find(t => t.id === selectedTask.id);
      if (refreshed) setSelectedTask(refreshed);
    }
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: N = focus quick-add
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        quickAddRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { data } = await res.json();
      setTasks(prev => {
        if (data.status === "completed" || data.status === "cancelled") return prev.filter(t => t.id !== id);
        return prev.map(t => t.id === id ? { ...t, ...data } : t);
      });
      if (selectedTask?.id === id) {
        if (data.status === "completed" || data.status === "cancelled") setSelectedTask(null);
        else setSelectedTask(prev => prev ? { ...prev, ...data } : prev);
      }
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
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Task removed");
    } else {
      toast.error("Failed to remove task");
    }
  }

  async function quickAdd() {
    const title = quickAddValue.trim();
    if (title.length < 3) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, title, priority: "medium", status: "pending", category: "OTHER" }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setTasks(prev => [data, ...prev]);
      setQuickAddValue("");
      toast.success("Task added");
    }
  }

  async function bulkComplete() {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => updateTask(id, { status: "completed" })));
    setSelected(new Set());
    toast.success(`${ids.length} tasks completed`);
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => deleteTask(id)));
    setSelected(new Set());
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const filteredTasks = useMemo(() => {
    if (categoryFilter === "my") return tasks.filter(t => t.assignedTo?.id === currentUserId || t.createdBy.id === currentUserId);
    if (categoryFilter === "all") return tasks;
    if (categoryFilter === "week") return tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekEnd);
    return tasks.filter(t => t.category === categoryFilter);
  }, [tasks, categoryFilter, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length;
  const myCount = tasks.filter(t => t.assignedTo?.id === currentUserId || t.createdBy.id === currentUserId).length;
  const weekCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekEnd).length;

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<TaskCategory, number>> = {};
    for (const t of tasks) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return counts;
  }, [tasks]);

  const tabs: { key: CategoryFilter; label: string; count: number; icon: string }[] = [
    { key: "my", label: "My Tasks", count: myCount, icon: "👤" },
    { key: "all", label: "All", count: tasks.length, icon: "📋" },
    { key: "week", label: "This Week", count: weekCount, icon: "📅" },
    ...Object.values(TaskCategory).map(c => ({
      key: c as CategoryFilter,
      label: TASK_CATEGORY_LABELS[c],
      count: categoryCounts[c] ?? 0,
      icon: TASK_CATEGORY_ICONS[c],
    })),
  ];

  return (
    <div className="flex flex-col h-full gap-0 min-h-0">

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <TaskStatsBar tasks={tasks} overdueCount={overdueCount} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          {overdueCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full cursor-default"
            >
              <AlertCircle className="w-3 h-3" />{overdueCount} overdue
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("board")}
              className={cn("p-1.5 rounded-md transition-all", viewMode === "board" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowPlaybook(true)}>
            <Target className="w-3.5 h-3.5" />Playbook
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />New Task
          </Button>
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setCategoryFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
              categoryFilter === tab.key
                ? "text-white border-transparent shadow-sm"
                : "text-gray-600 border-gray-200 bg-white hover:border-gray-300 hover:text-gray-800"
            )}
            style={categoryFilter === tab.key ? { backgroundColor: NAVY } : {}}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className={cn("text-xs rounded-full px-1.5 py-0 font-bold min-w-[18px] text-center leading-5",
                categoryFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Quick add bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Plus className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <input
            ref={quickAddRef}
            value={quickAddValue}
            onChange={e => setQuickAddValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") quickAdd(); }}
            placeholder="Quick add a task… (press N)"
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 bg-transparent focus:outline-none"
          />
          <AnimatePresence>
            {quickAddValue.length >= 3 && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={quickAdd} className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex-shrink-0">
                Add ⏎
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bulk action floating bar ───────────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl"
          >
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={bulkComplete} className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              <CheckCircle className="w-4 h-4" />Complete
            </button>
            <button onClick={bulkDelete} className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
              <Trash2 className="w-4 h-4" />Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-white ml-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        <div className={cn("flex-1 min-w-0 overflow-y-auto", selectedTask ? "pr-1" : "")}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-base font-semibold text-gray-700 mb-1">
                {categoryFilter === "my" ? "No tasks assigned to you" : "No tasks here"}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                {categoryFilter === "my" ? "Create a task and assign it to yourself, or get assigned by your manager." : "Import from Playbook or create your first task."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPlaybook(true)}>
                  <Target className="w-3.5 h-3.5" />Playbook
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-3.5 h-3.5" />New Task
                </Button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            <TaskListView tasks={filteredTasks} selectedId={selectedTask?.id} selected={selected}
              onSelect={setSelectedTask} onToggleSelect={id => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              onUpdate={updateTask} onDelete={deleteTask} />
          ) : (
            <TaskBoardView tasks={filteredTasks} selectedId={selectedTask?.id} onSelect={setSelectedTask} onUpdate={updateTask} />
          )}
        </div>

        {/* ── Detail panel ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div key="detail"
              initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 xl:w-96 flex-shrink-0 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-lg"
              style={{ maxHeight: "calc(100vh - 200px)", position: "sticky", top: 0 }}
            >
              <TaskDetailPanel
                task={selectedTask} teamMembers={teamMembers} currentUserId={currentUserId}
                onUpdate={updateTask} onDelete={deleteTask} onClose={() => setSelectedTask(null)}
                onResolved={(updatedTask) => {
                  setTasks(prev => {
                    if (updatedTask.status === "completed") return prev.filter(t => t.id !== updatedTask.id);
                    return prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
                  });
                  if (updatedTask.status === "completed") setSelectedTask(null);
                  else setSelectedTask(prev => prev ? { ...prev, ...updatedTask } : prev);
                }}
                campaignId={campaignId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} campaignId={campaignId}
        teamMembers={teamMembers} currentUserId={currentUserId}
        onCreated={(task) => { setTasks(prev => [task, ...prev]); setShowCreate(false); }} />

      <PlaybookModal open={showPlaybook} onClose={() => setShowPlaybook(false)} campaignId={campaignId}
        currentUserId={currentUserId} teamMembers={teamMembers}
        onImported={() => { setShowPlaybook(false); load(); toast.success("Playbook tasks imported!"); }} />
    </div>
  );
}

// ─── Task Stats Bar ────────────────────────────────────────────────────────────

function TaskStatsBar({ tasks, overdueCount }: { tasks: TaskItem[]; overdueCount: number }) {
  const urgent = tasks.filter(t => t.priority === "urgent").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  if (tasks.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[
        { label: "Active Tasks", value: tasks.length, icon: <Target className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Overdue", value: overdueCount, icon: <AlertCircle className="w-4 h-4" />, color: overdueCount > 0 ? "text-red-600" : "text-gray-400", bg: overdueCount > 0 ? "bg-red-50" : "bg-gray-50" },
        { label: "Urgent", value: urgent, icon: <Flame className="w-4 h-4" />, color: urgent > 0 ? "text-orange-600" : "text-gray-400", bg: urgent > 0 ? "bg-orange-50" : "bg-gray-50" },
        { label: "In Progress", value: inProgress, icon: <Zap className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", s.bg, s.color)}>{s.icon}</div>
          <div>
            <p className={cn("text-xl font-bold leading-none", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Task List View ────────────────────────────────────────────────────────────

function TaskListView({ tasks, selectedId, selected, onSelect, onToggleSelect, onUpdate, onDelete }: {
  tasks: TaskItem[]; selectedId?: string; selected: Set<string>;
  onSelect: (t: TaskItem) => void; onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const grouped = {
    urgent: tasks.filter(t => t.priority === "urgent"),
    high: tasks.filter(t => t.priority === "high"),
    medium: tasks.filter(t => t.priority === "medium"),
    low: tasks.filter(t => t.priority === "low"),
  };
  return (
    <div className="space-y-5">
      {grouped.urgent.length > 0 && <TaskGroup label="Urgent" accent="#E24B4A" tasks={grouped.urgent} selectedId={selectedId} selected={selected} onSelect={onSelect} onToggleSelect={onToggleSelect} onUpdate={onUpdate} onDelete={onDelete} />}
      {grouped.high.length > 0 && <TaskGroup label="High Priority" accent="#f97316" tasks={grouped.high} selectedId={selectedId} selected={selected} onSelect={onSelect} onToggleSelect={onToggleSelect} onUpdate={onUpdate} onDelete={onDelete} />}
      {grouped.medium.length > 0 && <TaskGroup label="Medium" accent="#3b82f6" tasks={grouped.medium} selectedId={selectedId} selected={selected} onSelect={onSelect} onToggleSelect={onToggleSelect} onUpdate={onUpdate} onDelete={onDelete} />}
      {grouped.low.length > 0 && <TaskGroup label="Low" accent="#9ca3af" tasks={grouped.low} selectedId={selectedId} selected={selected} onSelect={onSelect} onToggleSelect={onToggleSelect} onUpdate={onUpdate} onDelete={onDelete} />}
    </div>
  );
}

function TaskGroup({ label, accent, tasks, selectedId, selected, onSelect, onToggleSelect, onUpdate, onDelete }: {
  label: string; accent: string; tasks: TaskItem[]; selectedId?: string; selected: Set<string>;
  onSelect: (t: TaskItem) => void; onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 mb-2 w-full text-left">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-xs text-gray-400">({tasks.length})</span>
        <ChevronDown className={cn("w-3 h-3 text-gray-300 transition-transform ml-auto", collapsed && "-rotate-90")} />
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
            {tasks.map(t => (
              <TaskRow key={t.id} task={t} selected={t.id === selectedId} isSelected={selected.has(t.id)}
                onSelect={onSelect} onToggleSelect={onToggleSelect} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task: t, selected, isSelected, onSelect, onToggleSelect, onUpdate, onDelete }: {
  task: TaskItem; selected: boolean; isSelected: boolean;
  onSelect: (t: TaskItem) => void; onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const dueInfo = getDueInfo(t.dueDate, t.status);
  const catColors = TASK_CATEGORY_COLORS[t.category];
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer",
        selected ? "border-blue-300 bg-blue-50 shadow-sm"
          : dueInfo?.bg ? `border ${dueInfo.bg}`
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
        isSelected && "ring-2 ring-blue-300 ring-offset-1",
      )}
      onClick={() => onSelect(t)}
    >
      {/* Checkbox */}
      <button type="button" onClick={e => { e.stopPropagation(); onToggleSelect(t.id); }}
        className={cn("w-4 h-4 rounded border-2 flex-shrink-0 transition-all flex items-center justify-center",
          isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 hover:border-blue-400 opacity-0 group-hover:opacity-100")}>
        {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>}
      </button>
      {/* Complete circle */}
      <button type="button" onClick={e => { e.stopPropagation(); onUpdate(t.id, { status: "completed" }); }}
        className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
        title="Mark complete" />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
          {t.isRecurring && <span title="Recurring"><RefreshCw className="w-3 h-3 text-blue-400 flex-shrink-0" /></span>}
          {t._count.followUps > 0 && <span title={`${t._count.followUps} follow-up(s)`}><Link2 className="w-3 h-3 text-blue-300 flex-shrink-0" /></span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", catColors)}>
            {TASK_CATEGORY_ICONS[t.category]} {TASK_CATEGORY_LABELS[t.category]}
          </span>
          {t.contact && (
            <span className="text-xs text-blue-600 flex items-center gap-0.5">
              <SupportChip level={t.contact.supportLevel} />
              {fullName(t.contact.firstName, t.contact.lastName)}
            </span>
          )}
          {t.assignedTo && <span className="text-xs text-gray-400 truncate max-w-[90px]">{t.assignedTo.name ?? t.assignedTo.email}</span>}
          {dueInfo && (
            <span className={cn("text-xs flex items-center gap-0.5", dueInfo.color)}>
              {dueInfo.pulse
                ? <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    {dueInfo.label === "Overdue" ? <Flame className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  </motion.span>
                : <Clock className="w-3 h-3" />
              }
              {dueInfo.label}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className={cn("w-4 h-4 flex-shrink-0 transition-colors", selected ? "text-blue-400" : "text-gray-200 group-hover:text-gray-400")} />
    </motion.div>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

function TaskBoardView({ tasks, selectedId, onSelect, onUpdate }: {
  tasks: TaskItem[]; selectedId?: string;
  onSelect: (t: TaskItem) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const cols: { key: TaskStatus; label: string; colBg: string; headColor: string }[] = [
    { key: "pending", label: "To Do", colBg: "bg-gray-50", headColor: "text-gray-600" },
    { key: "in_progress", label: "In Progress", colBg: "bg-blue-50/50", headColor: "text-blue-600" },
  ];
  const priorityAccent: Record<TaskPriority, string> = { urgent: "#E24B4A", high: "#f97316", medium: "#3b82f6", low: "#9ca3af" };
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className={cn("flex-1 min-w-[280px] rounded-2xl border border-gray-200 flex flex-col overflow-hidden", col.colBg)}>
            <div className="px-4 py-3 border-b border-gray-200/70 flex items-center gap-2">
              <span className={cn("text-sm font-bold", col.headColor)}>{col.label}</span>
              <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-200 font-medium">{colTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence>
                {colTasks.map(t => (
                  <motion.div key={t.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelect(t)}
                    className={cn("bg-white rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md",
                      t.id === selectedId ? "border-blue-400 shadow-md" : "border-transparent hover:border-gray-200")}
                    style={{ borderLeftColor: priorityAccent[t.priority], borderLeftWidth: 3 }}
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1.5 line-clamp-2">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", TASK_CATEGORY_COLORS[t.category])}>
                        {TASK_CATEGORY_ICONS[t.category]} {TASK_CATEGORY_LABELS[t.category]}
                      </span>
                      {t.isRecurring && <RefreshCw className="w-3 h-3 text-blue-400" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {t.assignedTo && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: NAVY }}>
                            {(t.assignedTo.name ?? t.assignedTo.email ?? "?")[0].toUpperCase()}
                          </div>
                        )}
                        {(() => { const d = getDueInfo(t.dueDate, t.status); return d ? <span className={cn("text-xs", d.color)}>{d.label}</span> : null; })()}
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {col.key === "pending" && (
                          <button onClick={() => onUpdate(t.id, { status: "in_progress" })}
                            className="text-xs px-1.5 py-0.5 rounded text-blue-600 hover:bg-blue-50 font-medium" title="Start">▶</button>
                        )}
                        {col.key === "in_progress" && (
                          <button onClick={() => onUpdate(t.id, { status: "pending" })}
                            className="text-xs px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-50" title="Back">↩</button>
                        )}
                        <button onClick={() => onUpdate(t.id, { status: "completed" })}
                          className="text-xs px-1.5 py-0.5 rounded text-emerald-600 hover:bg-emerald-50 font-bold" title="Complete">✓</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {colTasks.length === 0 && <div className="text-center py-10 text-gray-300 text-sm">Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({ task, teamMembers, currentUserId, onUpdate, onDelete, onClose, onResolved, campaignId }: {
  task: TaskItem; teamMembers: { id: string; name: string | null; email: string | null }[];
  currentUserId: string; campaignId: string;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  onDelete: (id: string) => void; onClose: () => void;
  onResolved: (t: TaskItem) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [descVal, setDescVal] = useState(task.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [adoniSuggestion, setAdoniSuggestion] = useState<{ message: string; suggestedFollowUpTitle?: string; followUpCreated: boolean } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

  useEffect(() => { setTitleVal(task.title); setDescVal(task.description ?? ""); setShowResolution(false); setAdoniSuggestion(null); }, [task.id]);
  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingDesc) descRef.current?.focus(); }, [editingDesc]);

  async function saveTitle() {
    if (titleVal.trim() && titleVal !== task.title) await onUpdate(task.id, { title: titleVal.trim() });
    setEditingTitle(false);
  }
  async function saveDesc() {
    if (descVal !== (task.description ?? "")) await onUpdate(task.id, { description: descVal || null });
    setEditingDesc(false);
  }

  async function handleResolve(resolutionType: TaskResolutionType, resolutionNote: string, createFollowUp: boolean, followUpTitle: string, followUpDueDays: number) {
    const res = await fetch(`/api/tasks/${task.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionType, resolutionNote: resolutionNote || undefined, createFollowUp, followUpTitle: followUpTitle || undefined, followUpDueDays }),
    });
    if (res.ok) {
      const { data, adoni } = await res.json();
      onResolved(data);
      setShowResolution(false);
      setAdoniSuggestion(adoni);
    } else {
      toast.error("Resolution failed");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0", TASK_CATEGORY_COLORS[task.category])}>
            {TASK_CATEGORY_ICONS[task.category]} {TASK_CATEGORY_LABELS[task.category]}
          </span>
          {task.isRecurring && <span className="text-xs text-blue-300 flex items-center gap-0.5 flex-shrink-0"><RefreshCw className="w-3 h-3" />{task.recurringInterval}</span>}
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-white/10 text-white flex-shrink-0"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Parent chain */}
        {task.parentTask && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-600">Follow-up from:</span>
            <span className="text-xs font-medium text-blue-700 truncate">{task.parentTask.title}</span>
          </div>
        )}

        {/* Status + Priority */}
        <div className="flex gap-2">
          <select value={task.status} onChange={e => onUpdate(task.id, { status: e.target.value })}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={task.priority} onChange={e => onUpdate(task.id, { priority: e.target.value })}
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</label>
          <select value={task.category} onChange={e => onUpdate(task.id, { category: e.target.value })}
            className="mt-1 w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.values(TaskCategory).map(c => <option key={c} value={c}>{TASK_CATEGORY_ICONS[c]} {TASK_CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Title</label>
          {editingTitle ? (
            <input ref={titleRef} value={titleVal} onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); } }}
              className="mt-1 w-full text-sm font-medium text-gray-900 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ) : (
            <button type="button" onClick={() => setEditingTitle(true)}
              className="mt-1 w-full text-left text-sm font-medium text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors flex items-start justify-between gap-2 group">
              <span>{task.title}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
            </button>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />Notes
          </label>
          {editingDesc ? (
            <textarea ref={descRef} value={descVal} onChange={e => setDescVal(e.target.value)}
              onBlur={saveDesc}
              onKeyDown={e => { if (e.key === "Escape") { setDescVal(task.description ?? ""); setEditingDesc(false); } }}
              rows={3} placeholder="Add notes…"
              className="mt-1 w-full text-sm text-gray-700 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          ) : (
            <button type="button" onClick={() => setEditingDesc(true)}
              className="mt-1 w-full text-left text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors min-h-[48px] flex items-start justify-between gap-2 group">
              <span className={cn(!task.description && "text-gray-300 italic")}>{task.description || "Add notes…"}</span>
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-0.5" />
            </button>
          )}
        </div>

        {/* Assignee */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <UserCircle2 className="w-3 h-3" />Assigned To
          </label>
          <TeamMemberAutocomplete teamMembers={teamMembers} value={task.assignedTo?.id ?? null}
            onChange={id => onUpdate(task.id, { assignedToId: id })} className="mt-1" />
        </div>

        {/* Due date */}
        <div>
          <label className={cn("text-xs font-semibold uppercase tracking-wide flex items-center gap-1", isOverdue ? "text-red-500" : "text-gray-400")}>
            <CalendarDays className="w-3 h-3" />Due Date{isOverdue && <span className="font-bold"> — OVERDUE</span>}
          </label>
          <input type="date"
            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={e => onUpdate(task.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className={cn("mt-1 w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
              isOverdue ? "border-red-300 text-red-600" : "border-gray-200 text-gray-700")} />
        </div>

        {/* Recurring */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Recurring</span>
          </div>
          {task.isRecurring ? (
            <div className="flex items-center gap-2">
              <select value={task.recurringInterval ?? "weekly"} onChange={e => onUpdate(task.id, { recurringInterval: e.target.value })}
                className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button onClick={() => onUpdate(task.id, { isRecurring: false, recurringInterval: null })} className="text-xs text-red-400 hover:text-red-600">Off</button>
            </div>
          ) : (
            <button onClick={() => onUpdate(task.id, { isRecurring: true, recurringInterval: "weekly" })} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Enable</button>
          )}
        </div>

        {/* Contact */}
        {task.contact && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</label>
            <a href={`/contacts/${task.contact.id}`}
              className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-blue-600 font-medium">
              <SupportChip level={task.contact.supportLevel} />
              {fullName(task.contact.firstName, task.contact.lastName)}
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />
            </a>
          </div>
        )}

        {/* Previous resolution badge */}
        {task.resolutionType && (
          <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Last Resolution</p>
            <p className="text-sm text-gray-700 font-medium">{TASK_RESOLUTION_ICONS[task.resolutionType]} {TASK_RESOLUTION_LABELS[task.resolutionType]}</p>
            {task.resolutionNote && <p className="text-xs text-gray-500 mt-0.5 italic">&ldquo;{task.resolutionNote}&rdquo;</p>}
          </div>
        )}

        {/* Adoni suggestion */}
        <AnimatePresence>
          {adoniSuggestion && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: GREEN, backgroundColor: "#f0fdf9" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: GREEN }}>A</div>
                <span className="text-xs font-bold text-emerald-700">Adoni</span>
                {adoniSuggestion.followUpCreated && (
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-medium ml-auto">Follow-up created ✓</span>
                )}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{adoniSuggestion.message}</p>
              <button onClick={() => setAdoniSuggestion(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">Created by {task.createdBy.name ?? "Unknown"}</p>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <AnimatePresence mode="wait">
          {showResolution ? (
            <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TaskResolutionPicker task={task} onResolve={handleResolve} onCancel={() => setShowResolution(false)} />
            </motion.div>
          ) : confirmDelete ? (
            <motion.div key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <p className="text-xs text-red-600 font-medium flex-1">Remove this task?</p>
              <button onClick={() => onDelete(task.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600">Remove</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
            </motion.div>
          ) : (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              <button type="button" onClick={() => setShowResolution(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: GREEN }}>
                <Sparkles className="w-4 h-4" />Resolve
              </button>
              <button type="button" onClick={() => onUpdate(task.id, { status: task.status === "in_progress" ? "pending" : "in_progress" })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title={task.status === "in_progress" ? "Pause" : "Start"}>
                <Zap className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 border border-gray-200 text-sm font-medium text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Resolution Picker ────────────────────────────────────────────────────────

const RESOLUTION_BY_CATEGORY: Record<TaskCategory, TaskResolutionType[]> = {
  FIELD: ["COMPLETED", "MET_IN_PERSON", "VOICEMAIL_LEFT", "NOT_REACHED", "WRONG_NUMBER", "FOLLOW_UP_NEEDED"],
  VOLUNTEERS: ["COMPLETED", "RECRUITED", "DECLINED", "FOLLOW_UP_NEEDED", "NOT_REACHED"],
  COMMS: ["COMPLETED", "EMAIL_SENT", "FOLLOW_UP_NEEDED", "DELEGATED", "WONT_DO"],
  FINANCE: ["COMPLETED", "FOLLOW_UP_NEEDED", "BLOCKED", "DELEGATED"],
  ADMIN: ["COMPLETED", "DELEGATED", "BLOCKED", "WONT_DO", "FOLLOW_UP_NEEDED"],
  OTHER: ["COMPLETED", "FOLLOW_UP_NEEDED", "DELEGATED", "BLOCKED", "WONT_DO"],
};

function TaskResolutionPicker({ task, onResolve, onCancel }: {
  task: TaskItem;
  onResolve: (type: TaskResolutionType, note: string, createFollowUp: boolean, followUpTitle: string, followUpDueDays: number) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<TaskResolutionType | null>(null);
  const [note, setNote] = useState("");
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDays, setFollowUpDueDays] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const options = RESOLUTION_BY_CATEGORY[task.category] ?? RESOLUTION_BY_CATEGORY.OTHER;
  const needsFollowUp = picked && ["VOICEMAIL_LEFT", "NOT_REACHED", "FOLLOW_UP_NEEDED", "BLOCKED", "DELEGATED", "EMAIL_SENT"].includes(picked);

  useEffect(() => {
    if (needsFollowUp) {
      setCreateFollowUp(true);
      if (!followUpTitle) setFollowUpTitle(`Follow up: ${task.title}`);
    }
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!picked) return;
    setSubmitting(true);
    await onResolve(picked, note, createFollowUp, followUpTitle, followUpDueDays);
    setSubmitting(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">How was this resolved?</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(opt => (
          <button key={opt} onClick={() => setPicked(opt)}
            className={cn("flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left",
              picked === opt ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50")}>
            <span>{TASK_RESOLUTION_ICONS[opt]}</span>
            <span className="truncate">{TASK_RESOLUTION_LABELS[opt]}</span>
          </button>
        ))}
      </div>
      {picked && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 overflow-hidden">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Quick note (optional)…"
            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          {needsFollowUp && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={createFollowUp} onChange={e => setCreateFollowUp(e.target.checked)} className="rounded" />
                <span className="font-medium">Create follow-up task</span>
              </label>
              {createFollowUp && (
                <div className="space-y-1.5 pl-4">
                  <input value={followUpTitle} onChange={e => setFollowUpTitle(e.target.value)} placeholder="Follow-up title…"
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <select value={followUpDueDays} onChange={e => setFollowUpDueDays(Number(e.target.value))}
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
                    <option value={1}>Due tomorrow</option>
                    <option value={2}>In 2 days</option>
                    <option value={3}>In 3 days</option>
                    <option value={5}>In 5 days</option>
                    <option value={7}>Next week</option>
                    <option value={14}>In 2 weeks</option>
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: GREEN }}>
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? "Resolving…" : "Resolve & Get Adoni's Take"}
            </button>
            <button onClick={onCancel} className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">Cancel</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ open, onClose, campaignId, teamMembers, currentUserId, onCreated }: {
  open: boolean; onClose: () => void; campaignId: string;
  teamMembers: { id: string; name: string | null; email: string | null }[];
  currentUserId: string; onCreated: (task: TaskItem) => void;
}) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { campaignId, priority: "medium", status: "pending", category: "OTHER" as TaskCategory },
  });
  const dueDateVal = watch("dueDate");

  async function onSubmit(data: CreateTaskInput) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { data: task } = await res.json();
      toast.success("Task created");
      reset({ campaignId, priority: "medium", status: "pending", category: "OTHER" as TaskCategory });
      onCreated(task);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <FormField label="Task Title" error={errors.title?.message} required
          help={{ content: "One task = one clear action. Keep it short and actionable.", example: "Call Jane Smith about transit concerns" }}>
          <Input {...register("title")} placeholder="e.g. Call Jane Smith about transit concerns" autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" help={{ content: "Groups this task by campaign function — Field, Comms, Finance, Volunteers, or Admin.", example: "Field: canvassing tasks; Finance: budget tasks" }}>
            <select {...register("category")} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.values(TaskCategory).map(c => <option key={c} value={c}>{TASK_CATEGORY_ICONS[c]} {TASK_CATEGORY_LABELS[c]}</option>)}
            </select>
          </FormField>
          <FormField label="Priority" help={{ content: "Urgent = top of the list in red. Set honestly — everything can't be urgent.", tip: "If 5+ tasks are urgent, re-prioritize." }}>
            <select {...register("priority")} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Due Date" help={{ content: "The deadline. Overdue tasks are flagged immediately.", tip: "A real deadline creates accountability." }}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Today", value: smartDateValue(0) },
                { label: "Tomorrow", value: smartDateValue(1) },
                { label: "+3 days", value: smartDateValue(3) },
                { label: "This Friday", value: nextFriday() },
                { label: "+1 week", value: smartDateValue(7) },
                { label: "+2 weeks", value: smartDateValue(14) },
              ].map(s => (
                <button key={s.label} type="button"
                  onClick={() => setValue("dueDate", new Date(s.value).toISOString())}
                  className={cn("px-2 py-1 text-xs rounded-lg border font-medium transition-all",
                    dueDateVal?.slice(0, 10) === s.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600")}>
                  {s.label}
                </button>
              ))}
            </div>
            <Input {...register("dueDate", { setValueAs: v => v ? new Date(v).toISOString() : null })} type="date" />
          </div>
        </FormField>
        <FormField label="Assign To" help={{ content: "Who on your team is responsible. Unassigned tasks fall through the cracks.", tip: "Assign every task. Shared ownership = no ownership." }}>
          <input type="hidden" {...register("assignedToId")} />
          <TeamMemberAutocomplete teamMembers={teamMembers} value={watch("assignedToId") ?? null}
            onChange={id => setValue("assignedToId", id ?? undefined)} />
        </FormField>
        <FormField label="Notes" help={{ content: "Context for the assignee. Not visible to the contact." }}>
          <textarea {...register("description")} rows={2} placeholder="Any extra context or instructions…"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </FormField>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <RefreshCw className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer flex-1">
            <input type="checkbox" {...register("isRecurring")} className="rounded" />
            Recurring task
          </label>
          {watch("isRecurring") && (
            <select {...register("recurringInterval")} className="text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white">
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Playbook Modal ────────────────────────────────────────────────────────────

function PlaybookModal({ open, onClose, campaignId, currentUserId, teamMembers, onImported }: {
  open: boolean; onClose: () => void; campaignId: string;
  currentUserId: string; teamMembers: { id: string; name: string | null; email: string | null }[];
  onImported: () => void;
}) {
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [importing, setImporting] = useState(false);

  async function importPhase() {
    setImporting(true);
    const phase = PLAYBOOK_PHASES[selectedPhase];
    await Promise.all(phase.tasks.map(t => {
      const due = new Date();
      due.setDate(due.getDate() + t.daysOut);
      return fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, title: t.title, priority: t.priority, category: t.category, status: "pending", dueDate: due.toISOString() }),
      });
    }));
    setImporting(false);
    onImported();
  }

  return (
    <Modal open={open} onClose={onClose} title="Campaign Playbook" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Import a pre-built task set matched to your campaign phase. These are the tasks every winning campaign runs.</p>
        <div className="space-y-2">
          {PLAYBOOK_PHASES.map((phase, i) => (
            <button key={i} onClick={() => setSelectedPhase(i)}
              className={cn("w-full text-left p-4 rounded-xl border-2 transition-all",
                selectedPhase === i ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white")}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">{phase.label}</span>
                <span className="text-xs text-gray-500 font-medium">{phase.tasks.length} tasks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {phase.tasks.slice(0, 4).map((t, j) => (
                  <span key={j} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                    {t.title.length > 32 ? t.title.slice(0, 32) + "…" : t.title}
                  </span>
                ))}
                {phase.tasks.length > 4 && <span className="text-xs text-gray-400">+{phase.tasks.length - 4} more</span>}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={importPhase} loading={importing} className="flex-1">
            <Plus className="w-4 h-4" />Import {PLAYBOOK_PHASES[selectedPhase].tasks.length} Tasks
          </Button>
        </div>
      </div>
    </Modal>
  );
}
