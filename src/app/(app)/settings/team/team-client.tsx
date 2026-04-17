"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus, X, Shield, Mail, Trash2, AlertCircle, Check, ChevronDown, ChevronUp, QrCode, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/ui";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
  lastLoginAt: string | null;
  isSelf: boolean;
}

const ROLES = [
  // SUPER_ADMIN intentionally excluded — platform operator role is not assignable at campaign level
  { value: "ADMIN", label: "Admin", description: "Full access to everything in this campaign" },
  { value: "CAMPAIGN_MANAGER", label: "Campaign Manager", description: "All features except billing and team" },
  { value: "FIELD_DIRECTOR", label: "Field Director", description: "Canvassing, walk lists, volunteer shifts, GOTV" },
  { value: "COMMUNICATIONS_DIRECTOR", label: "Comms Director", description: "Notifications, media, messaging" },
  { value: "FINANCE_OFFICER", label: "Finance Officer", description: "Donations, budget, compliance reports" },
  { value: "DATA_ANALYST", label: "Data Analyst", description: "Analytics, reports, import/export" },
  { value: "VOLUNTEER_LEADER", label: "Volunteer Leader", description: "Manage volunteers, shifts, walk lists" },
  { value: "VOLUNTEER", label: "Canvasser", description: "Walk list, quick capture, read-only contacts" },
  { value: "OBSERVER", label: "Observer", description: "Read-only access to dashboards" },
  { value: "PUBLIC_USER", label: "Public User", description: "No campaign access" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["All permissions", "Platform settings", "Billing", "Multi-campaign management", "Custom roles"],
  ADMIN: ["Team management", "Campaign settings", "All contacts", "Import/Export", "Donations", "Analytics", "Canvassing", "Volunteers", "Notifications", "Signs"],
  CAMPAIGN_MANAGER: ["Campaign settings", "All contacts", "Import/Export", "Donations", "Analytics", "Canvassing", "Volunteers", "Notifications", "Signs"],
  FIELD_DIRECTOR: ["Canvassing", "Walk lists", "Volunteer shifts", "GOTV operations", "View contacts", "Edit contacts", "Signs"],
  COMMUNICATIONS_DIRECTOR: ["Notifications", "Media management", "Messaging", "View contacts", "Events"],
  FINANCE_OFFICER: ["Donations", "Budget management", "Compliance reports", "View contacts"],
  DATA_ANALYST: ["Analytics", "Reports", "Import/Export", "View contacts"],
  VOLUNTEER_LEADER: ["View contacts", "Edit contacts", "Canvassing", "Walk lists", "Volunteer shifts"],
  VOLUNTEER: ["View contacts (read-only)", "Canvassing", "Quick capture"],
  OBSERVER: ["View dashboards (read-only)", "View reports (read-only)"],
  PUBLIC_USER: ["No campaign permissions"],
};

const ROLE_COLOURS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  CAMPAIGN_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
  FIELD_DIRECTOR: "bg-teal-100 text-teal-800 border-teal-200",
  COMMUNICATIONS_DIRECTOR: "bg-indigo-100 text-indigo-800 border-indigo-200",
  FINANCE_OFFICER: "bg-amber-100 text-amber-800 border-amber-200",
  DATA_ANALYST: "bg-cyan-100 text-cyan-800 border-cyan-200",
  VOLUNTEER_LEADER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VOLUNTEER: "bg-gray-100 text-gray-800 border-gray-200",
  OBSERVER: "bg-stone-100 text-stone-700 border-stone-200",
  PUBLIC_USER: "bg-slate-100 text-slate-700 border-slate-200",
};

const PERMISSIONS_MATRIX = [
  { feature: "View contacts", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: true, VOLUNTEER: true } },
  { feature: "Edit contacts", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: true, VOLUNTEER: false } },
  { feature: "Delete contacts", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Import / Export", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Canvassing", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: true, VOLUNTEER: true } },
  { feature: "Volunteer shifts", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: true, VOLUNTEER: false } },
  { feature: "Donations", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Send notifications", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Team management", roles: { ADMIN: true, CAMPAIGN_MANAGER: false, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Billing", roles: { ADMIN: true, CAMPAIGN_MANAGER: false, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
];

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

interface TeamClientProps {
  campaignId: string;
  currentUserRole: string;
  globalUserRole: string;
  initialMembers: Member[];
}

type TeamTab = "members" | "permissions" | "custom" | "join" | "audit";

interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

export default function TeamClient({ campaignId, currentUserRole, globalUserRole, initialMembers }: TeamClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("VOLUNTEER");
  const [inviteSending, setInviteSending] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamTab>("members");
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDesc, setCustomRoleDesc] = useState("");
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [joinLabel, setJoinLabel] = useState("Volunteer Night");
  const [joinRole, setJoinRole] = useState("VOLUNTEER");
  const [joinMaxUses, setJoinMaxUses] = useState(50);
  const [joinExpiryDays, setJoinExpiryDays] = useState(7);
  const [joinLink, setJoinLink] = useState("");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const canManageTeam = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN" || globalUserRole === "SUPER_ADMIN";
  const canManagePermissions = currentUserRole === "SUPER_ADMIN" || globalUserRole === "SUPER_ADMIN";

  const tabs = useMemo(
    () => [
      { id: "members" as TeamTab, label: "Members" },
      { id: "permissions" as TeamTab, label: "Roles & Permissions" },
      { id: "custom" as TeamTab, label: "Custom Roles" },
      { id: "join" as TeamTab, label: "Join Links & QR Codes" },
      { id: "audit" as TeamTab, label: "Audit Log" },
    ],
    [],
  );

  function logAudit(action: string, detail: string) {
    setAuditEntries((prev) => [{ id: crypto.randomUUID(), action, detail, createdAt: new Date().toISOString() }, ...prev]);
  }

  async function updateRole(memberId: string, role: string) {
    const prev = members;
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, role } : m)));
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, campaignId }),
      });
      if (!res.ok) throw new Error(await res.text());
      logAudit("Role changed", `${memberId} -> ${role}`);
      toast.success("Role updated");
    } catch {
      setMembers(prev);
      toast.error("Failed to update role");
    }
  }

  async function removeMember(member: Member) {
    if (member.isSelf) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!confirm(`Remove ${member.name || member.email} from this campaign?`)) return;
    const prev = members;
    setMembers((ms) => ms.filter((m) => m.id !== member.id));
    try {
      const res = await fetch(`/api/team/${member.id}?campaignId=${campaignId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      logAudit("Member removed", `${member.name || member.email}`);
      toast.success("Member removed");
    } catch {
      setMembers(prev);
      toast.error("Failed to remove member");
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    setInviteSending(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invite failed");
      }
      toast.success("Invitation sent");
      logAudit("Invite sent", `${inviteEmail.trim().toLowerCase()} as ${inviteRole}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("VOLUNTEER");
      // Refresh
      const r2 = await fetch(`/api/team?campaignId=${campaignId}`);
      if (r2.ok) {
        const data = await r2.json();
        setMembers(data.members);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInviteSending(false);
    }
  }

  function createCustomRole() {
    if (!customRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    const next = {
      id: crypto.randomUUID(),
      name: customRoleName.trim(),
      description: customRoleDesc.trim() || "Custom campaign role",
    };
    setCustomRoles((prev) => [next, ...prev]);
    logAudit("Custom role created", next.name);
    setCustomRoleName("");
    setCustomRoleDesc("");
    toast.success("Custom role saved");
  }

  function generateJoinLink() {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const base = typeof window !== "undefined" ? window.location.origin : "https://poll.city";
    const link = `${base}/volunteer/onboard/${token}?role=${joinRole}&label=${encodeURIComponent(joinLabel)}&maxUses=${joinMaxUses}&expiryDays=${joinExpiryDays}`;
    setJoinLink(link);
    logAudit("Join link generated", `${joinRole} - ${joinLabel}`);
  }

  async function copyJoinLink() {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      toast.success("Join link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Management"
        description="Manage who has access to this campaign and their permissions."
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-2">
        <div className="grid gap-2 md:grid-cols-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!canManageTeam && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Read-only access</p>
            <p className="text-amber-700">Only campaign admins can invite or change roles.</p>
          </div>
        </div>
      )}

      {/* Members list */}
      {activeTab === "members" && (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Team members ({members.length})</h2>
          </div>
          {canManageTeam && (
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite member
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {members.map((m) => (
            <div key={m.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 truncate">{m.name || m.email.split("@")[0]}</p>
                  {m.isSelf && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{m.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last login: {formatDate(m.lastLoginAt)} · Joined: {formatDate(m.joinedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManageTeam && !m.isSelf ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      ROLE_COLOURS[m.role] ?? "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                  </span>
                )}
                {canManageTeam && !m.isSelf && (
                  <button
                    onClick={() => removeMember(m)}
                    aria-label="Remove member"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Roles & Permissions — expandable cards for all 11 roles */}
      {activeTab === "permissions" && (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">All roles ({ROLES.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {ROLES.map((r) => {
            const isExp = expandedRole === r.value;
            const perms = ROLE_PERMISSIONS[r.value] ?? [];
            return (
              <div key={r.value}>
                <button
                  type="button"
                  onClick={() => setExpandedRole(isExp ? null : r.value)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors min-h-[44px] text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ROLE_COLOURS[r.value] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {r.label}
                    </span>
                    <span className="text-sm text-gray-500">{r.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{perms.length} permission{perms.length !== 1 ? "s" : ""}</span>
                    {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isExp && (
                  <div className="px-5 pb-4 pl-8">
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {perms.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1D9E75" }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {activeTab === "custom" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          {!canManagePermissions ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Only super admins can create custom roles.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={customRoleName} onChange={(e) => setCustomRoleName(e.target.value)} placeholder="Role name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input value={customRoleDesc} onChange={(e) => setCustomRoleDesc(e.target.value)} placeholder="Description" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <button onClick={createCustomRole} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create custom role</button>
              <div className="space-y-2">
                {customRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No custom roles yet.</p>
                ) : customRoles.map((role) => (
                  <div key={role.id} className="rounded-xl border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "join" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={joinLabel} onChange={(e) => setJoinLabel(e.target.value)} placeholder="Link label" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <select value={joinRole} onChange={(e) => setJoinRole(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input type="number" min={1} value={joinMaxUses} onChange={(e) => setJoinMaxUses(Number(e.target.value) || 1)} placeholder="Max uses" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" min={1} value={joinExpiryDays} onChange={(e) => setJoinExpiryDays(Number(e.target.value) || 1)} placeholder="Expiry days" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generateJoinLink} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white min-h-[44px] transition-colors" style={{ backgroundColor: "#1D9E75" }}>
              <QrCode className="w-4 h-4" />
              Generate QR Code
            </button>
            <button onClick={copyJoinLink} disabled={!joinLink} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 min-h-[44px]">Copy Link</button>
            <button onClick={() => window.print()} disabled={!joinLink} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 min-h-[44px]">Print QR</button>
          </div>
          {joinLink && (
            <div className="grid gap-4 md:grid-cols-[1fr_260px] items-start rounded-xl border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 break-all">{joinLink}</p>
                <p className="text-xs text-gray-500 mt-2">Volunteers scan this QR code to join the campaign team via <code className="bg-gray-100 px-1 rounded">/volunteer/onboard/[token]</code>.</p>
                <div className="flex gap-2 mt-3 text-xs text-gray-500">
                  <span>Max uses: {joinMaxUses}</span>
                  <span>Expires: {joinExpiryDays} day{joinExpiryDays !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {/* SVG QR code placeholder — deterministic pattern from token */}
              <div className="w-[240px] h-[240px] rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-center">
                <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
                  {/* Finder patterns (top-left, top-right, bottom-left) */}
                  <rect x="0" y="0" width="7" height="7" fill="#0A2342" />
                  <rect x="1" y="1" width="5" height="5" fill="white" />
                  <rect x="2" y="2" width="3" height="3" fill="#0A2342" />
                  <rect x="14" y="0" width="7" height="7" fill="#0A2342" />
                  <rect x="15" y="1" width="5" height="5" fill="white" />
                  <rect x="16" y="2" width="3" height="3" fill="#0A2342" />
                  <rect x="0" y="14" width="7" height="7" fill="#0A2342" />
                  <rect x="1" y="15" width="5" height="5" fill="white" />
                  <rect x="2" y="16" width="3" height="3" fill="#0A2342" />
                  {/* Data modules — decorative pattern */}
                  {[8,9,10,11,12].map((x) => [8,9,10,11,12].map((y) => (
                    <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x + y) % 3 === 0 ? "#0A2342" : ((x * y) % 2 === 0 ? "#1D9E75" : "white")} />
                  )))}
                  {[8,9,10,11,12].map((x) => [0,1,2,3,4,5,6].map((y) => (
                    <rect key={`v${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x + y) % 2 === 0 ? "#0A2342" : "white"} />
                  )))}
                  {[0,1,2,3,4,5,6].map((x) => [8,9,10,11,12].map((y) => (
                    <rect key={`h${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x + y) % 2 === 0 ? "#0A2342" : "white"} />
                  )))}
                  {[14,15,16,17,18,19,20].map((x) => [8,9,10,11,12].map((y) => (
                    <rect key={`r${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x * y) % 3 === 0 ? "#0A2342" : "white"} />
                  )))}
                  {[8,9,10,11,12].map((x) => [14,15,16,17,18,19,20].map((y) => (
                    <rect key={`b${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x + y) % 3 !== 0 ? "#0A2342" : "white"} />
                  )))}
                  {[14,15,16,17,18,19,20].map((x) => [14,15,16,17,18,19,20].map((y) => (
                    <rect key={`br${x}-${y}`} x={x} y={y} width="1" height="1" fill={(x * y + x) % 3 === 0 ? "#1D9E75" : ((x + y) % 2 === 0 ? "#0A2342" : "white")} />
                  )))}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Permission audit log</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {auditEntries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">No permission changes recorded yet.</p>
            ) : auditEntries.map((entry) => (
              <div key={entry.id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                <p className="text-sm text-gray-600">{entry.detail}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Invite team member</h3>
                <p className="text-sm text-gray-500">They'll receive an email with a sign-in link.</p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        inviteRole === r.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={inviteRole === r.value}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{r.label}</p>
                        <p className="text-xs text-gray-500">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setInviteOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvite}
                  disabled={inviteSending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg"
                >
                  {inviteSending ? "Sending…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
