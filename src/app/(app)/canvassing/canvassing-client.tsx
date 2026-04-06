"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, MapPin, Users, ChevronRight, CheckCircle, Bell, BellOff } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader, Badge, Modal, FormField, Input, Textarea, Select, EmptyState } from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCanvassListSchema, CreateCanvassListInput } from "@/lib/validators";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import dynamic from "next/dynamic";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

interface CanvassList {
  id: string; name: string; description: string | null; status: string; createdAt: string;
  assignments: { id: string; status: string; user: { id: string; name: string | null } }[];
}

interface Props { campaignId: string; currentUserId: string; teamMembers: { id: string; name: string | null; email: string | null }[]; }

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600", in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700", paused: "bg-amber-100 text-amber-700",
};
const statusLabels: Record<string, string> = {
  not_started: "Not Started", in_progress: "In Progress", completed: "Completed", paused: "Paused",
};

export default function CanvassingClient({ campaignId, currentUserId, teamMembers }: Props) {
  const [lists, setLists] = useState<CanvassList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const { permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications(campaignId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/canvass?campaignId=${campaignId}`);
      const data = await res.json();
      setLists(data.data ?? []);
    } catch { toast.error("Failed to load canvass lists"); }
    finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!assignUserId || !showAssign) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/canvass/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ canvassListId: showAssign, userId: assignUserId }) });
      if (res.ok) { toast.success("Volunteer assigned"); setShowAssign(null); load(); }
      else toast.error("Failed to assign");
    } finally { setAssigning(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Canvassing"
        description="Manage walk lists and track door-knock progress"
        actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />New List</Button>}
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Campaign Map</h2>
          <p className="text-xs text-gray-500">Draw turfs, review volunteer coverage, and estimate effort live.</p>
        </CardHeader>
        <CardContent>
          <CampaignMap
            mode="canvassing"
            height={460}
            showControls
            showCalculator
            onTurfDraw={(coordinates, stats) => {
              const summary = `Draft turf with ${coordinates.length} points, ${stats.doors} doors, ${stats.estimatedHours} hours estimated`;
              window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill: summary } }));
            }}
          />
        </CardContent>
      </Card>

      {/* Push Notification Settings */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Bell className="w-4 h-4 text-green-600" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <BellOff className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-500">
                  {isSubscribed
                    ? "You'll receive notifications for campaign updates and GOTV alerts"
                    : permission === "denied"
                    ? "Notifications are blocked. Enable them in your browser settings."
                    : "Get notified about campaign updates and GOTV alerts"
                  }
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading || permission === "denied"}
            >
              {pushLoading ? "..." : isSubscribed ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
      ) : lists.length === 0 ? (
        <Card><EmptyState icon={<MapPin className="w-10 h-10" />} title="No canvass lists" description="Create a walk list and assign it to volunteers to start tracking door-knock activity." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create List</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="hover:shadow-md transition-shadow"
              draggable
              onDragStart={(event) => {
                const payload = JSON.stringify({
                  type: "canvass-list",
                  id: list.id,
                  name: list.name,
                  status: list.status,
                  assigned: list.assignments.length,
                });
                event.dataTransfer.setData("application/json", payload);
                event.dataTransfer.setData("text/plain", `Canvass list ${list.name}`);
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{list.name}</h3>
                    {list.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{list.description}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", statusColors[list.status])}>{statusLabels[list.status]}</span>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{list.assignments.length} assigned</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Created {formatDate(list.createdAt)}</div>
                </div>
                {list.assignments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Assigned to</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.assignments.map((a) => (
                        <span key={a.id} className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[a.status])}>
                          {a.user.name ?? "Unknown"} · {statusLabels[a.status]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => { setShowAssign(list.id); setAssignUserId(""); }} className="flex-1">
                    <Users className="w-3.5 h-3.5" />Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Canvass entry quick guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-5">
          <h3 className="font-semibold text-blue-900 mb-2">📱 Mobile Canvassing</h3>
          <p className="text-sm text-blue-700 mb-3">When door-knocking, open a contact and tap <strong>Log Interaction</strong> to record responses on your phone. All data syncs in real time.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {["Support level", "Issues of concern", "Sign request", "Volunteer interest"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-blue-700"><CheckCircle className="w-3.5 h-3.5 text-blue-500" />{item}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create list modal */}
      <CreateCanvassModal open={showCreate} onClose={() => setShowCreate(false)} campaignId={campaignId} onCreated={() => { setShowCreate(false); load(); }} />

      {/* Assign modal */}
      <Modal open={!!showAssign} onClose={() => setShowAssign(null)} title="Assign Volunteer" size="sm">
        <div className="space-y-4">
          <FormField label="Select Volunteer">
            <Select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
              <option value="">Choose a volunteer…</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAssign(null)} className="flex-1">Cancel</Button>
            <Button onClick={assign} loading={assigning} disabled={!assignUserId} className="flex-1">Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CreateCanvassModal({ open, onClose, campaignId, onCreated }: { open: boolean; onClose: () => void; campaignId: string; onCreated: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateCanvassListInput>({
    resolver: zodResolver(createCanvassListSchema), defaultValues: { campaignId },
  });
  async function onSubmit(data: CreateCanvassListInput) {
    const res = await fetch("/api/canvass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast.success("Canvass list created"); reset(); onCreated(); }
    else { const e = await res.json(); toast.error(e.error ?? "Failed"); }
  }
  return (
    <Modal open={open} onClose={onClose} title="New Canvass List" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <FormField label="List Name" error={errors.name?.message} required>
          <Input {...register("name")} placeholder="East Ward 12 — April Blitz" />
        </FormField>
        <FormField label="Description">
          <Textarea {...register("description")} rows={2} placeholder="Target area, focus, instructions for volunteers…" />
        </FormField>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Create</Button>
        </div>
      </form>
    </Modal>
  );
}
