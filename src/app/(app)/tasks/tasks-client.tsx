"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, CheckCircle, Clock, AlertCircle, Filter } from "lucide-react";
import { Button, Card, PageHeader, Select, SupportLevelBadge, Badge, Modal, FormField, Input, Textarea, EmptyState } from "@/components/ui";
import { formatDate, fullName, cn } from "@/lib/utils";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS, TaskStatus, TaskPriority } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, CreateTaskInput } from "@/lib/validators";
import { toast } from "sonner";

interface TaskItem {
  id: string; title: string; description: string | null; status: TaskStatus; priority: TaskPriority;
  dueDate: string | null; completedAt: string | null;
  assignedTo: { id: string; name: string | null; email: string | null } | null;
  createdBy: { id: string; name: string | null };
  contact: { id: string; firstName: string; lastName: string } | null;
}

interface Props { campaignId: string; teamMembers: { id: string; name: string | null; email: string | null }[]; currentUserId: string; }

export default function TasksClient({ campaignId, teamMembers, currentUserId }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [mineOnly, setMineOnly] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ campaignId, pageSize: "50" });
      if (statusFilter === "active") { p.set("status", "pending"); }
      else if (statusFilter !== "all") p.set("status", statusFilter);
      if (mineOnly) p.set("mine", "true");
      const res = await fetch(`/api/tasks?${p}`);
      const data = await res.json();
      let taskData = data.data ?? [];
      if (statusFilter === "active") {
        const res2 = await fetch(`/api/tasks?${new URLSearchParams({ campaignId, status: "in_progress", pageSize: "50" })}`);
        const data2 = await res2.json();
        taskData = [...taskData, ...(data2.data ?? [])];
      }
      setTasks(taskData);
      setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }, [campaignId, statusFilter, mineOnly]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: TaskStatus) {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(status === "completed" ? "Task completed!" : "Status updated"); load(); }
    else toast.error("Failed to update task");
  }

  const grouped = {
    urgent: tasks.filter(t => t.priority === "urgent" && t.status !== "completed"),
    high: tasks.filter(t => t.priority === "high" && t.status !== "completed"),
    other: tasks.filter(t => !["urgent", "high"].includes(t.priority) && t.status !== "completed"),
    completed: tasks.filter(t => t.status === "completed"),
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Tasks"
        description={`${total} tasks`}
        actions={
          <div className="flex gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="active">Active</option>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Button size="sm" variant={mineOnly ? "default" : "outline"} onClick={() => setMineOnly(!mineOnly)}>
              {mineOnly ? "My Tasks" : "All Tasks"}
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />New Task</Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
      ) : tasks.length === 0 ? (
        <Card><EmptyState icon={<CheckCircle className="w-10 h-10" />} title="No tasks found" description="Create a task to track follow-ups and action items." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Task</Button>} /></Card>
      ) : (
        <div className="space-y-5">
          {grouped.urgent.length > 0 && <TaskGroup label="🚨 Urgent" tasks={grouped.urgent} onStatusChange={updateStatus} />}
          {grouped.high.length > 0 && <TaskGroup label="🔴 High Priority" tasks={grouped.high} onStatusChange={updateStatus} />}
          {grouped.other.length > 0 && <TaskGroup label="Tasks" tasks={grouped.other} onStatusChange={updateStatus} />}
          {statusFilter !== "active" && grouped.completed.length > 0 && <TaskGroup label="✅ Completed" tasks={grouped.completed} onStatusChange={updateStatus} dimmed />}
        </div>
      )}

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} campaignId={campaignId} teamMembers={teamMembers} onCreated={() => { setShowCreate(false); load(); }} />
    </div>
  );
}

function TaskGroup({ label, tasks, onStatusChange, dimmed }: { label: string; tasks: TaskItem[]; onStatusChange: (id: string, s: TaskStatus) => void; dimmed?: boolean }) {
  return (
    <div>
      <h3 className={cn("text-xs font-semibold uppercase tracking-wide mb-2", dimmed ? "text-gray-400" : "text-gray-500")}>{label} ({tasks.length})</h3>
      <div className="space-y-2">
        {tasks.map((t) => <TaskCard key={t.id} task={t} onStatusChange={onStatusChange} dimmed={dimmed} />)}
      </div>
    </div>
  );
}

function TaskCard({ task: t, onStatusChange, dimmed }: { task: TaskItem; onStatusChange: (id: string, s: TaskStatus) => void; dimmed?: boolean }) {
  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed";

  return (
    <Card className={cn("p-4 flex items-start gap-3", dimmed && "opacity-60")}>
      <button
        onClick={() => onStatusChange(t.id, t.status === "completed" ? "pending" : "completed")}
        className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors flex items-center justify-center", t.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400")}
      >
        {t.status === "completed" && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={cn("text-sm font-medium", t.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</p>
          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", TASK_PRIORITY_COLORS[t.priority])}>{t.priority}</span>
          <span className={cn("text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600")}>{TASK_STATUS_LABELS[t.status]}</span>
        </div>
        {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {t.contact && <span className="text-xs text-blue-600">→ {fullName(t.contact.firstName, t.contact.lastName)}</span>}
          {t.assignedTo && <span className="text-xs text-gray-400">Assigned: {t.assignedTo.name ?? t.assignedTo.email}</span>}
          {t.dueDate && <span className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "text-gray-400")}><Clock className="w-3 h-3" />{isOverdue ? "Overdue · " : "Due "}{formatDate(t.dueDate)}</span>}
        </div>
      </div>
      <Select value={t.status} onChange={(e) => onStatusChange(t.id, e.target.value as TaskStatus)} className="w-32 text-xs" onClick={(e) => e.stopPropagation()}>
        {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </Card>
  );
}

function CreateTaskModal({ open, onClose, campaignId, teamMembers, onCreated }: { open: boolean; onClose: () => void; campaignId: string; teamMembers: { id: string; name: string | null; email: string | null }[]; onCreated: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateTaskInput>({ resolver: zodResolver(createTaskSchema), defaultValues: { campaignId, priority: "medium", status: "pending" } });

  async function onSubmit(data: CreateTaskInput) {
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast.success("Task created"); reset(); onCreated(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <FormField label="Task Title" error={errors.title?.message} required>
          <Input {...register("title")} placeholder="Follow up with Jane Smith about transit concerns" />
        </FormField>
        <FormField label="Description"><Textarea {...register("description")} rows={3} placeholder="Additional context…" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Priority">
            <Select {...register("priority")}>
              {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
          <FormField label="Due Date"><Input {...register("dueDate")} type="date" /></FormField>
        </div>
        <FormField label="Assign To">
          <Select {...register("assignedToId")}>
            <option value="">Unassigned</option>
            {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
          </Select>
        </FormField>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create Task</Button>
        </div>
      </form>
    </Modal>
  );
}
