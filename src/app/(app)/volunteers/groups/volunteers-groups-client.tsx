"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Crown, MessageSquare, UserPlus, UserMinus, MapPin,
  Send, X,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label,
  Textarea, Badge, EmptyState, PageHeader, Modal, Select, FieldHelp,
} from "@/components/ui";
import { toast } from "sonner";

/* ─── types ─────────────────────────────────────────────────────────── */
interface VolunteerProfile {
  id: string;
  totalHours: number;
  skills: string[];
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  contact: { id: string; firstName: string | null; lastName: string | null; phone: string | null; email: string | null } | null;
}

interface GroupMember {
  id: string;
  volunteerProfile: VolunteerProfile;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  targetWard: string | null;
  leaderProfileId: string | null;
  leaderProfile: VolunteerProfile | null;
  members: GroupMember[];
}

interface Props { campaignId: string }

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

function profileName(p: VolunteerProfile): string {
  if (p.user?.name) return p.user.name;
  const c = p.contact;
  if (c) return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Volunteer";
  return "Volunteer";
}

function profileEmail(p: VolunteerProfile): string {
  return p.user?.email ?? p.contact?.email ?? "";
}

export default function VolunteersGroupsClient({ campaignId }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<VolunteerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMessage, setShowMessage] = useState<Group | null>(null);
  const [showAddMember, setShowAddMember] = useState<Group | null>(null);
  const [addMemberId, setAddMemberId] = useState("");
  const [msgTitle, setMsgTitle] = useState("Team Update");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", targetWard: "", leaderProfileId: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, vRes] = await Promise.all([
        fetch(`/api/volunteers/groups?campaignId=${campaignId}`),
        fetch(`/api/volunteers?campaignId=${campaignId}&pageSize=200`),
      ]);
      const gData = await gRes.json();
      const vData = await vRes.json();
      setGroups(gData.data ?? []);
      setProfiles(vData.data ?? []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function createGroup() {
    if (!form.name.trim()) { toast.error("Group name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/volunteers/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...form, leaderProfileId: form.leaderProfileId || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast.success("Group created");
      setShowCreate(false);
      setForm({ name: "", description: "", targetWard: "", leaderProfileId: "" });
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function addMember(groupId: string) {
    if (!addMemberId) return;
    try {
      const res = await fetch(`/api/volunteers/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerProfileIds: [addMemberId] }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      toast.success("Member added");
      setShowAddMember(null);
      setAddMemberId("");
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function removeMember(groupId: string, volunteerProfileId: string) {
    try {
      const res = await fetch(`/api/volunteers/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerProfileIds: [volunteerProfileId], remove: true }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member removed");
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function sendMessage() {
    if (!showMessage || !msgBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/volunteers/groups/${showMessage.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: msgTitle, message: msgBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Message sent to ${data.data?.notified ?? 0} members`);
      setShowMessage(null);
      setMsgTitle("Team Update"); setMsgBody("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSending(false); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 pb-12">
      <PageHeader
        title="Volunteer Groups"
        description="Organize teams with leadership, messaging, and performance tracking"
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 min-h-[44px]">
            <Plus className="w-4 h-4" /> New Group
          </Button>
        }
      />

      {/* Groups list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => <div key={j} className="w-8 h-8 bg-gray-200 rounded-full" />)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No groups yet"
          description="Create ward teams to organize your volunteers"
          action={<Button onClick={() => setShowCreate(true)} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Create Group</Button>}
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {groups.map((group, i) => {
              const groupHours = group.members.reduce((s, m) => s + (m.volunteerProfile.totalHours ?? 0), 0);
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...spring, delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                            <Badge variant="info">{group.members.length} members</Badge>
                          </div>
                          {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {group.targetWard && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {group.targetWard}</span>
                            )}
                            {group.leaderProfile && (
                              <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-[#EF9F27]" /> {profileName(group.leaderProfile)}</span>
                            )}
                            <span>{groupHours.toFixed(1)} total hours</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => setShowMessage(group)} className="min-h-[44px]">
                            <MessageSquare className="w-4 h-4" /> Message
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowAddMember(group); setAddMemberId(""); }} className="min-h-[44px]">
                            <UserPlus className="w-4 h-4" /> Add
                          </Button>
                        </div>
                      </div>

                      {/* Members */}
                      {group.members.length === 0 ? (
                        <p className="text-sm text-gray-400">No members yet</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {group.members.map((m) => {
                            const isLeader = m.volunteerProfile.id === group.leaderProfileId;
                            return (
                              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                    isLeader ? "bg-[#EF9F27] text-white" : "bg-[#0A2342] text-white"
                                  }`}>
                                    {profileName(m.volunteerProfile).slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                                      {profileName(m.volunteerProfile)}
                                      {isLeader && <Crown className="w-3 h-3 text-[#EF9F27] flex-shrink-0" />}
                                    </p>
                                    <p className="text-xs text-gray-500">{(m.volunteerProfile.totalHours ?? 0).toFixed(1)}h</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeMember(group.id, m.volunteerProfile.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  title="Remove member"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Group" size="md">
        <div className="space-y-4">
          <div>
            <Label required className="inline-flex items-center gap-1">Group Name <FieldHelp content="A short name for this volunteer team. Typically named by ward or area." example="Ward 12 Canvassers" /></Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Ward 12 Team" className="min-h-[44px]" />
          </div>
          <div>
            <Label className="inline-flex items-center gap-1">Description <FieldHelp content="What is this group responsible for? Helps volunteers understand the team's purpose." example="Handles all door-to-door canvassing in the north end of Ward 12." /></Label>
            <Textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="e.g. Handles door-to-door canvassing in the north end of the ward." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="inline-flex items-center gap-1">Target Ward <FieldHelp content="The ward or geographic area this group is focused on. Used for filtering and assignments." example="Ward 12, Downtown North" /></Label>
              <Input value={form.targetWard} onChange={(e) => setForm((s) => ({ ...s, targetWard: e.target.value }))} placeholder="e.g. Ward 12" className="min-h-[44px]" />
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Team Leader <FieldHelp content="The volunteer who leads this group. They receive group messages and are listed as the point of contact." tip="You can change this later." /></Label>
              <Select value={form.leaderProfileId} onChange={(e) => setForm((s) => ({ ...s, leaderProfileId: e.target.value }))} className="min-h-[44px]">
                <option value="">No leader assigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{profileName(p)}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={createGroup} loading={saving} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Create Group</Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={!!showAddMember} onClose={() => setShowAddMember(null)} title={`Add Member to ${showAddMember?.name ?? ""}`}>
        {showAddMember && (
          <div className="space-y-4">
            <div>
              <Label className="inline-flex items-center gap-1">Select Volunteer <FieldHelp content="Choose the volunteer you want to add to this group. Only active volunteers not already in the group are shown." /></Label>
              <Select value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)} className="min-h-[44px]">
                <option value="">Choose volunteer...</option>
                {profiles
                  .filter((p) => !showAddMember.members.some((m) => m.volunteerProfile.id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{profileName(p)}</option>
                  ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowAddMember(null)} className="min-h-[44px]">Cancel</Button>
              <Button onClick={() => addMember(showAddMember.id)} disabled={!addMemberId} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
                <UserPlus className="w-4 h-4" /> Add Member
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal open={!!showMessage} onClose={() => setShowMessage(null)} title={`Message: ${showMessage?.name ?? ""}`}>
        {showMessage && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Send a notification to all {showMessage.members.length} member{showMessage.members.length !== 1 ? "s" : ""} of this group.
            </p>
            <div>
              <Label required className="inline-flex items-center gap-1">Title <FieldHelp content="A short subject line for your message. Volunteers will see this as the notification title." example="Saturday canvass — meet at 10am" /></Label>
              <Input value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="e.g. Saturday canvass — meet at 10am" className="min-h-[44px]" />
            </div>
            <div>
              <Label required className="inline-flex items-center gap-1">Message <FieldHelp content="The full message your volunteers will receive. Include location, time, and what to bring." tip="3–5 sentences is ideal. Volunteers skim — be direct." /></Label>
              <Textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} placeholder="e.g. We're meeting at 45 Elm St at 10am this Saturday. Bring your phone and comfortable shoes. Pizza after!" className="min-h-[120px]" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowMessage(null)} className="min-h-[44px]">Cancel</Button>
              <Button onClick={sendMessage} loading={sending} disabled={!msgBody.trim()} className="bg-[#0A2342] hover:bg-[#0A2342]/90 min-h-[44px]">
                <Send className="w-4 h-4" /> Send Message
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
