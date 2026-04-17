"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Users, UserCheck, UserMinus, Search,
  ChevronDown, ChevronUp, MapPin, Crown, Trophy,
  BarChart2, Calendar, Star,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Spinner, StatCard,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: string;
  teamId: string;
  campaignId: string;
  userId: string | null;
  volunteerId: string | null;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  user: { id: string; name: string | null } | null;
}

export interface TeamRow {
  id: string;
  campaignId: string;
  name: string;
  leadUserId: string | null;
  ward: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { members: number };
  leadUser: { id: string; name: string | null } | null;
  members: MemberRow[];
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialTeams: TeamRow[];
}

// ── Performance scoring ───────────────────────────────────────────────────────

function computePerformanceScore(team: TeamRow): number {
  let score = 0;
  // Member count — up to 50 pts (5+ members = max)
  score += Math.min((team._count.members / 5) * 50, 50);
  // Lead assigned — 25 pts
  if (team.leadUser) score += 25;
  // Ward assigned — 25 pts
  if (team.ward) score += 25;
  return Math.round(score);
}

function performanceBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Elite",    color: "text-[#1D9E75]", bg: "bg-[#1D9E75]/10" };
  if (score >= 50) return { label: "Active",   color: "text-[#EF9F27]", bg: "bg-[#EF9F27]/10" };
  return              { label: "Building", color: "text-muted-foreground", bg: "bg-muted/50" };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TeamsClient({ campaignId, campaignName, initialTeams }: Props) {
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"teams" | "leaderboard">("teams");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [addMemberDrawer, setAddMemberDrawer] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", ward: "", leadUserId: "" });
  const [saving, setSaving] = useState(false);

  const [memberForm, setMemberForm] = useState({ userId: "", role: "member" as "member" | "leader" });
  const [addingMember, setAddingMember] = useState(false);

  const filtered = teams.filter((t) =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.ward ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const leaderboard = useMemo(
    () =>
      [...teams]
        .map((t) => ({ ...t, score: computePerformanceScore(t) }))
        .sort((a, b) => b.score - a.score || b._count.members - a._count.members),
    [teams],
  );

  const globalStats = useMemo(() => ({
    totalMembers: teams.reduce((s, t) => s + t._count.members, 0),
    teamsWithLead: teams.filter((t) => t.leadUser).length,
    teamsWithWard: teams.filter((t) => t.ward).length,
    avgScore: teams.length
      ? Math.round(teams.reduce((s, t) => s + computePerformanceScore(t), 0) / teams.length)
      : 0,
  }), [teams]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Team name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/field/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          ward: form.ward || undefined,
          leadUserId: form.leadUserId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create team"); return; }
      setTeams((prev) => [...prev, data.data]);
      setShowDrawer(false);
      setForm({ name: "", ward: "", leadUserId: "" });
      toast.success("Team created");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(teamId: string) {
    if (!memberForm.userId.trim()) { toast.error("User ID is required"); return; }
    setAddingMember(true);
    try {
      const res = await fetch(`/api/field/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, userId: memberForm.userId, role: memberForm.role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add member"); return; }
      setTeams((prev) => prev.map((t) =>
        t.id === teamId
          ? { ...t, members: [...t.members, data.data], _count: { members: t._count.members + 1 } }
          : t
      ));
      setAddMemberDrawer(null);
      setMemberForm({ userId: "", role: "member" });
      toast.success("Member added");
    } catch {
      toast.error("Network error");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleDeactivateTeam(teamId: string) {
    const prev = teams;
    setTeams((t) => t.filter((team) => team.id !== teamId));
    try {
      const res = await fetch(`/api/field/teams/${teamId}?campaignId=${campaignId}`, { method: "DELETE" });
      if (!res.ok) {
        setTeams(prev);
        toast.error("Failed to deactivate team");
      } else {
        toast.success("Team deactivated");
      }
    } catch {
      setTeams(prev);
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Teams"
        description={`Manage volunteer teams for ${campaignName}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant={view === "leaderboard" ? "default" : "outline"}
              size="sm"
              onClick={() => setView(view === "leaderboard" ? "teams" : "leaderboard")}
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              {view === "leaderboard" ? "Back to Teams" : "Leaderboard"}
            </Button>
            <Button onClick={() => setShowDrawer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          </div>
        }
      />

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Teams"   value={teams.length}               icon={<Users className="h-5 w-5" />} />
        <StatCard label="Total Members"  value={globalStats.totalMembers}    icon={<UserCheck className="h-5 w-5" />} color="blue" />
        <StatCard label="Teams w/ Lead"  value={globalStats.teamsWithLead}   icon={<Crown className="h-5 w-5" />} color="green" />
        <StatCard label="Avg Readiness"  value={`${globalStats.avgScore}%`}  icon={<BarChart2 className="h-5 w-5" />} />
      </div>

      {/* ── Leaderboard view ────────────────────────────────────────────────── */}
      {view === "leaderboard" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Teams ranked by readiness score (members, lead assignment, ward coverage)
          </p>
          {leaderboard.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="No teams yet"
              description="Create teams to see them on the leaderboard."
              action={<Button onClick={() => setShowDrawer(true)}><Plus className="h-4 w-4 mr-2" />New Team</Button>}
            />
          ) : (
            leaderboard.map((team, idx) => {
              const badge = performanceBadge(team.score);
              return (
                <motion.div key={team.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                          idx === 0 ? "bg-[#EF9F27]/20 text-[#EF9F27]" :
                          idx === 1 ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" :
                          idx === 2 ? "bg-orange-100 text-orange-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {idx === 0 ? <Trophy className="h-4 w-4" /> : idx + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{team.name}</span>
                            {team.ward && (
                              <Badge variant="default" className="text-xs">
                                <MapPin className="h-3 w-3 mr-0.5" />Ward {team.ward}
                              </Badge>
                            )}
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.color, badge.bg)}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{team._count.members} member{team._count.members !== 1 ? "s" : ""}</span>
                            {team.leadUser && (
                              <span className="flex items-center gap-1">
                                <Crown className="h-3 w-3" />{team.leadUser.name}
                              </span>
                            )}
                          </div>

                          {/* Score bar */}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[#1D9E75] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${team.score}%` }}
                              transition={{ delay: idx * 0.05, duration: 0.5 }}
                            />
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-[#0A2342] dark:text-white">{team.score}</p>
                          <p className="text-[10px] text-muted-foreground">/ 100</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ── Teams list view ──────────────────────────────────────────────────── */}
      {view === "teams" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No field teams"
              description="Create your first team to organise volunteers for canvassing and lit drops."
              action={<Button onClick={() => setShowDrawer(true)}><Plus className="h-4 w-4 mr-2" />New Team</Button>}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((team) => {
                const isExpanded = expanded.has(team.id);
                const score = computePerformanceScore(team);
                const badge = performanceBadge(score);

                return (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(team.id)}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{team.name}</span>
                              {team.ward && (
                                <Badge variant="default" className="flex items-center gap-1 text-xs">
                                  <MapPin className="h-3 w-3" />Ward {team.ward}
                                </Badge>
                              )}
                              <Badge variant="info" className="text-xs">
                                {team._count.members} member{team._count.members !== 1 ? "s" : ""}
                              </Badge>
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.color, badge.bg)}>
                                {badge.label}
                              </span>
                            </div>
                            {team.leadUser && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Crown className="h-3 w-3" />Lead: {team.leadUser.name}
                              </p>
                            )}
                            {/* Readiness bar */}
                            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden max-w-32">
                              <div
                                className="h-full bg-[#1D9E75] rounded-full"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground text-xs"
                              title="Schedule Shift"
                              onClick={() => {
                                const url = `/field-ops?tab=runs&teamId=${team.id}`;
                                window.location.href = url;
                              }}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              Shift
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setAddMemberDrawer(team.id); setMemberForm({ userId: "", role: "member" }); }}
                            >
                              <Plus className="h-3 w-3 mr-1" />Add
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleExpand(team.id)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 border-t pt-4 space-y-2">
                                {/* Performance breakdown */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <div className="text-center">
                                    <p className="text-lg font-bold">{team._count.members}</p>
                                    <p className="text-[10px] text-muted-foreground">Members</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold">{team.leadUser ? "✓" : "—"}</p>
                                    <p className="text-[10px] text-muted-foreground">Lead</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold">{score}</p>
                                    <p className="text-[10px] text-muted-foreground">Score</p>
                                  </div>
                                </div>

                                {/* Member list */}
                                {team.members.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No members yet.</p>
                                ) : (
                                  team.members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-2">
                                        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-sm">{m.user?.name ?? m.userId ?? "Unknown"}</span>
                                        {m.role === "leader" && (
                                          <Badge variant="warning" className="text-xs">Leader</Badge>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        Joined {new Date(m.joinedAt).toLocaleDateString("en-CA")}
                                      </span>
                                    </div>
                                  ))
                                )}
                                <div className="pt-2 border-t">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeactivateTeam(team.id)}
                                  >
                                    <UserMinus className="h-3.5 w-3.5 mr-1" />
                                    Deactivate Team
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Create Team Drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l shadow-xl z-50 overflow-y-auto"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">New Field Team</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowDrawer(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <FormField label="Team Name *">
                    <Input
                      placeholder="e.g. Team Alpha"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </FormField>
                  <FormField label="Ward">
                    <Input
                      placeholder="20"
                      value={form.ward}
                      onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                    />
                  </FormField>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDrawer(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Create Team
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add Member Drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {addMemberDrawer && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddMemberDrawer(null)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l shadow-xl z-50 overflow-y-auto"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Add Team Member</h2>
                  <Button variant="ghost" size="icon" onClick={() => setAddMemberDrawer(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <FormField label="User ID">
                    <Input
                      placeholder="Paste user ID"
                      value={memberForm.userId}
                      onChange={(e) => setMemberForm((f) => ({ ...f, userId: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Role">
                    <select
                      className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ring"
                      )}
                      value={memberForm.role}
                      onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value as "member" | "leader" }))}
                    >
                      <option value="member">Member</option>
                      <option value="leader">Leader</option>
                    </select>
                  </FormField>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setAddMemberDrawer(null)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={addingMember}
                      onClick={() => handleAddMember(addMemberDrawer)}
                    >
                      {addingMember ? <Spinner className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                      Add Member
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
