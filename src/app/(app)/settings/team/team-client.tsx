"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus, X, Shield, Mail, Trash2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui";

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
  { value: "ADMIN", label: "Admin", description: "Full access to everything" },
  { value: "CAMPAIGN_MANAGER", label: "Manager", description: "All features except billing and team" },
  { value: "VOLUNTEER_LEADER", label: "Volunteer Leader", description: "Manage volunteers, shifts, walk lists" },
  { value: "VOLUNTEER", label: "Canvasser", description: "Walk list, quick capture, read-only contacts" },
] as const;

const ROLE_COLOURS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  CAMPAIGN_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
  VOLUNTEER_LEADER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VOLUNTEER: "bg-gray-100 text-gray-800 border-gray-200",
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
  initialMembers: Member[];
}

type TeamTab = "members" | "permissions" | "custom" | "join" | "audit";

interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

export default function TeamClient({ campaignId, currentUserRole, initialMembers }: TeamClientProps) {
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

  const canManageTeam = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";
  const canManagePermissions = currentUserRole === "SUPER_ADMIN";

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
    const link = `${base}/join/${token}?role=${joinRole}&label=${encodeURIComponent(joinLabel)}&maxUses=${joinMaxUses}&expiryDays=${joinExpiryDays}`;
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

      {/* Permissions matrix */}
      {activeTab === "permissions" && (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Role permissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Feature</th>
                {ROLES.map((r) => (
                  <th key={r.value} className="text-center px-3 py-2.5 font-semibold text-gray-700">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PERMISSIONS_MATRIX.map((row) => (
                <tr key={row.feature}>
                  <td className="px-4 py-2.5 text-gray-900">{row.feature}</td>
                  {ROLES.map((r) => (
                    <td key={r.value} className="text-center px-3 py-2.5">
                      {row.roles[r.value as keyof typeof row.roles] ? (
                        <Check className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
            <button onClick={generateJoinLink} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create Join Link</button>
            <button onClick={copyJoinLink} disabled={!joinLink} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Copy Link</button>
            <button onClick={() => window.print()} disabled={!joinLink} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Print QR</button>
          </div>
          {joinLink && (
            <div className="grid gap-4 md:grid-cols-[1fr_260px] items-start rounded-xl border border-gray-200 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 break-all">{joinLink}</p>
                <p className="text-xs text-gray-500 mt-2">Scan to join the campaign team.</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinLink)}`}
                alt="Join QR Code"
                className="rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Permission and access audit</h2>
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
