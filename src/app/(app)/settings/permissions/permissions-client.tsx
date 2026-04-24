"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Minus,
  Users,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { PageHeader, FieldHelp } from "@/components/ui";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  isSelf: boolean;
}

interface PermissionsClientProps {
  campaignId: string;
  currentUserRole: string;
  initialMembers: Member[];
}

// ─── Role definitions ─────────────────────────────────────────────────────────

const ROLES = [
  { value: "ADMIN", label: "Admin", color: "bg-red-100 text-red-800 border-red-200", description: "Full campaign access — all features and billing" },
  { value: "CAMPAIGN_MANAGER", label: "Campaign Manager", color: "bg-blue-100 text-blue-800 border-blue-200", description: "All campaign features except billing and team management" },
  { value: "FIELD_DIRECTOR", label: "Field Director", color: "bg-teal-100 text-teal-800 border-teal-200", description: "Canvassing, walk lists, volunteer shifts, GOTV" },
  { value: "COMMUNICATIONS_DIRECTOR", label: "Comms Director", color: "bg-indigo-100 text-indigo-800 border-indigo-200", description: "Notifications, media, messaging, events" },
  { value: "FINANCE_OFFICER", label: "Finance Officer", color: "bg-amber-100 text-amber-800 border-amber-200", description: "Donations, budget, and compliance reports" },
  { value: "DATA_ANALYST", label: "Data Analyst", color: "bg-cyan-100 text-cyan-800 border-cyan-200", description: "Analytics, reports, import/export" },
  { value: "VOLUNTEER_LEADER", label: "Volunteer Leader", color: "bg-emerald-100 text-emerald-800 border-emerald-200", description: "Manage volunteers, shifts, walk lists" },
  { value: "VOLUNTEER", label: "Canvasser", color: "bg-gray-100 text-gray-800 border-gray-200", description: "Assigned turfs, quick capture, read-only contacts" },
  { value: "OBSERVER", label: "Observer", color: "bg-stone-100 text-stone-700 border-stone-200", description: "Read-only dashboards and reports" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

// ─── Permission matrix ────────────────────────────────────────────────────────
// true = full access, "read" = view only, false = no access

type AccessLevel = true | "read" | false;

interface PermRow {
  feature: string;
  category: string;
  access: Partial<Record<RoleValue, AccessLevel>>;
}

const PERMISSION_MATRIX: PermRow[] = [
  // Contacts
  { feature: "View contacts", category: "Contacts", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: "read", COMMUNICATIONS_DIRECTOR: "read", FINANCE_OFFICER: "read", DATA_ANALYST: "read", VOLUNTEER_LEADER: true, VOLUNTEER: "read", OBSERVER: "read" } },
  { feature: "Edit contacts", category: "Contacts", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: false } },
  { feature: "Delete contacts", category: "Contacts", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: false, VOLUNTEER_LEADER: false, VOLUNTEER: false } },
  { feature: "Import / Export", category: "Contacts", access: { ADMIN: true, CAMPAIGN_MANAGER: true, DATA_ANALYST: true, FIELD_DIRECTOR: false, VOLUNTEER: false } },
  // Field Ops
  { feature: "Canvassing & walk lists", category: "Field Ops", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: true, COMMUNICATIONS_DIRECTOR: false, FINANCE_OFFICER: false } },
  { feature: "GOTV operations", category: "Field Ops", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: "read", VOLUNTEER: false } },
  { feature: "Signs management", category: "Field Ops", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: false } },
  // Volunteers
  { feature: "View volunteers", category: "Volunteers", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, OBSERVER: "read" } },
  { feature: "Manage volunteer shifts", category: "Volunteers", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: false } },
  // Communications
  { feature: "Send notifications / SMS", category: "Communications", access: { ADMIN: true, CAMPAIGN_MANAGER: true, COMMUNICATIONS_DIRECTOR: true, FIELD_DIRECTOR: false, VOLUNTEER: false } },
  { feature: "Email blasts", category: "Communications", access: { ADMIN: true, CAMPAIGN_MANAGER: true, COMMUNICATIONS_DIRECTOR: true, FIELD_DIRECTOR: false } },
  { feature: "Media management", category: "Communications", access: { ADMIN: true, CAMPAIGN_MANAGER: true, COMMUNICATIONS_DIRECTOR: true } },
  // Finance
  { feature: "View donations", category: "Finance", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FINANCE_OFFICER: true, DATA_ANALYST: "read", OBSERVER: "read" } },
  { feature: "Record / manage donations", category: "Finance", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FINANCE_OFFICER: true, VOLUNTEER: false } },
  { feature: "Budget management", category: "Finance", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FINANCE_OFFICER: true } },
  { feature: "Compliance reports", category: "Finance", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FINANCE_OFFICER: true, DATA_ANALYST: "read" } },
  // Analytics
  { feature: "Analytics & reports", category: "Analytics", access: { ADMIN: true, CAMPAIGN_MANAGER: true, DATA_ANALYST: true, FIELD_DIRECTOR: "read", FINANCE_OFFICER: "read", OBSERVER: "read" } },
  // Admin
  { feature: "Team management", category: "Admin", access: { ADMIN: true, CAMPAIGN_MANAGER: false } },
  { feature: "Campaign settings", category: "Admin", access: { ADMIN: true, CAMPAIGN_MANAGER: true } },
  { feature: "Billing", category: "Admin", access: { ADMIN: true } },
  // Events
  { feature: "Events", category: "Events", access: { ADMIN: true, CAMPAIGN_MANAGER: true, COMMUNICATIONS_DIRECTOR: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: "read" } },
  // Tasks
  { feature: "Tasks", category: "Tasks", access: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: "read" } },
];

// ─── Adoni access matrix ──────────────────────────────────────────────────────

interface AdoniRow {
  capability: string;
  description: string;
  roles: Partial<Record<RoleValue, boolean>>;
}

const ADONI_MATRIX: AdoniRow[] = [
  { capability: "Campaign Q&A", description: "Ask Adoni questions about your campaign data and contacts", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, COMMUNICATIONS_DIRECTOR: true, FINANCE_OFFICER: true, DATA_ANALYST: true, VOLUNTEER_LEADER: true, VOLUNTEER: false, OBSERVER: true } },
  { capability: "Canvassing guidance", description: "Door script help, objection handling, GOTV tips", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, VOLUNTEER_LEADER: true, VOLUNTEER: true } },
  { capability: "Analytics insights", description: "Ask Adoni to interpret reports and suggest actions", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, DATA_ANALYST: true, FIELD_DIRECTOR: true, OBSERVER: true } },
  { capability: "Draft communications", description: "Generate email, SMS, or notification copy", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, COMMUNICATIONS_DIRECTOR: true } },
  { capability: "Compliance guidance", description: "Ontario election finance rules, CASL, reporting deadlines", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, FINANCE_OFFICER: true } },
  { capability: "Platform help", description: "How-to guidance for any Poll City feature", roles: { ADMIN: true, CAMPAIGN_MANAGER: true, FIELD_DIRECTOR: true, COMMUNICATIONS_DIRECTOR: true, FINANCE_OFFICER: true, DATA_ANALYST: true, VOLUNTEER_LEADER: true, VOLUNTEER: true, OBSERVER: true } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AccessIcon({ level }: { level: AccessLevel | undefined }) {
  if (level === true) return <Check className="w-4 h-4 mx-auto" style={{ color: "#1D9E75" }} />;
  if (level === "read") return <span className="text-xs font-medium text-amber-600 block text-center">View</span>;
  if (level === false) return <X className="w-4 h-4 mx-auto text-gray-300" />;
  return <Minus className="w-4 h-4 mx-auto text-gray-200" />;
}

function BoolIcon({ ok }: { ok: boolean | undefined }) {
  if (ok) return <Check className="w-4 h-4 mx-auto" style={{ color: "#1D9E75" }} />;
  return <X className="w-4 h-4 mx-auto text-gray-300" />;
}

const MATRIX_ROLES: RoleValue[] = ["ADMIN", "CAMPAIGN_MANAGER", "FIELD_DIRECTOR", "COMMUNICATIONS_DIRECTOR", "FINANCE_OFFICER", "DATA_ANALYST", "VOLUNTEER_LEADER", "VOLUNTEER"];

function getRoleLabel(value: string): string {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

function getRoleColor(value: string): string {
  return ROLES.find((r) => r.value === value)?.color ?? "bg-gray-100 text-gray-700 border-gray-200";
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = "matrix" | "roles" | "adoni";

export default function PermissionsClient({
  campaignId,
  currentUserRole,
  initialMembers,
}: PermissionsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("matrix");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canManage =
    currentUserRole === "ADMIN" ||
    currentUserRole === "SUPER_ADMIN" ||
    currentUserRole === "CAMPAIGN_MANAGER";

  // Group permission rows by category
  const categories = Array.from(new Set(PERMISSION_MATRIX.map((r) => r.category)));

  async function handleRoleChange(memberId: string, newRole: string) {
    const prev = members;
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    setUpdatingId(memberId);
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole, campaignId }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Role updated");
    } catch {
      setMembers(prev);
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "matrix", label: "Permission Matrix", icon: <Shield className="w-4 h-4" /> },
    { id: "adoni", label: "Adoni Access", icon: <Sparkles className="w-4 h-4" /> },
    { id: "roles", label: "Role Definitions", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Permissions"
        description="Role-based access control — see exactly what each role can do in this campaign."
        actions={
          <Link
            href="/settings/team"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Manage team members
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Current user role callout */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-semibold text-blue-900">Your role: </span>
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${getRoleColor(currentUserRole)}`}
          >
            {getRoleLabel(currentUserRole)}
          </span>
          {!canManage && (
            <span className="text-blue-700 ml-2">
              You have read-only access to this page. Contact an Admin to change permissions.
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2">
        <div className="grid gap-2 grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px] ${
                activeTab === tab.id
                  ? "bg-[#0A2342] text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "matrix" ? "Matrix" : tab.id === "adoni" ? "Adoni" : "Roles"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Permission Matrix ── */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Feature access by role</h2>
              <FieldHelp
                content="This matrix shows which roles can access each feature. 'View' means read-only access. A checkmark means full access."
                tip="Assign roles from Settings → Team. Role changes take effect immediately."
              />
            </div>
          </div>

          {/* Scroll container for wide table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 w-[200px] sticky left-0 bg-gray-50 z-10">
                    Feature
                  </th>
                  {MATRIX_ROLES.map((r) => (
                    <th
                      key={r}
                      className="text-center px-2 py-3 font-semibold text-gray-600 min-w-[80px]"
                    >
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border ${getRoleColor(r)}`}
                      >
                        {getRoleLabel(r)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((category) => {
                  const rows = PERMISSION_MATRIX.filter((r) => r.category === category);
                  return rows.map((row, idx) => (
                    <tr key={row.feature} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2.5 sticky left-0 bg-white hover:bg-gray-50 z-10">
                        {idx === 0 && (
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {category}
                          </p>
                        )}
                        <span className="text-gray-800">{row.feature}</span>
                      </td>
                      {MATRIX_ROLES.map((r) => (
                        <td key={r} className="px-2 py-2.5 text-center">
                          <AccessIcon level={row.access[r]} />
                        </td>
                      ))}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" style={{ color: "#1D9E75" }} />
              <span>Full access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-amber-600">View</span>
              <span>Read-only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-gray-300" />
              <span>No access</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5 text-gray-200" />
              <span>Not applicable</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Adoni Access Matrix ── */}
      {activeTab === "adoni" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#1D9E75" }} />
              <div>
                <h2 className="font-semibold text-gray-900">Adoni AI access by role</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Adoni&apos;s capabilities are scoped to what each role needs. Canvassers get
                  door-script help; Finance Officers get compliance guidance.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700 w-[220px] sticky left-0 bg-gray-50 z-10">
                    Capability
                  </th>
                  {MATRIX_ROLES.map((r) => (
                    <th
                      key={r}
                      className="text-center px-2 py-3 font-semibold text-gray-600 min-w-[80px]"
                    >
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border ${getRoleColor(r)}`}
                      >
                        {getRoleLabel(r)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ADONI_MATRIX.map((row) => (
                  <tr key={row.capability} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 sticky left-0 bg-white hover:bg-gray-50 z-10">
                      <p className="font-medium text-gray-900">{row.capability}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
                    </td>
                    {MATRIX_ROLES.map((r) => (
                      <td key={r} className="px-2 py-3 text-center">
                        <BoolIcon ok={row.roles[r]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Adoni always follows campaign confidentiality — he never reveals sensitive
              data (donor PII, internal notes) to roles without access.
            </p>
          </div>
        </div>
      )}

      {/* ── Role Definitions ── */}
      {activeTab === "roles" && (
        <div className="space-y-3">
          {/* Member role assignment (for admins) */}
          {canManage && members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">
                    Assign roles ({members.length} member{members.length !== 1 ? "s" : ""})
                  </h2>
                  <FieldHelp
                    content="Change a team member's role to adjust what they can access. Changes take effect immediately."
                    tip="You cannot change your own role. To remove a member, go to Settings → Team."
                  />
                </div>
                <Link
                  href="/settings/team"
                  className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  Invite members
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {m.name ?? m.email.split("@")[0]}
                        {m.isSelf && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{m.email}</p>
                    </div>
                    {!m.isSelf ? (
                      <select
                        value={m.role}
                        disabled={updatingId === m.id}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleColor(m.role)}`}
                      >
                        {getRoleLabel(m.role)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canManage && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Only Admins and Campaign Managers can assign roles. Contact your campaign admin to change permissions.
              </p>
            </div>
          )}

          {/* Role definition cards */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">All roles ({ROLES.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {ROLES.map((role) => {
                const isExpanded = expandedRole === role.value;
                const adoniCaps = ADONI_MATRIX.filter(
                  (row) => row.roles[role.value as RoleValue],
                );
                const matrixRows = PERMISSION_MATRIX.filter(
                  (row) => row.access[role.value as RoleValue] !== undefined && row.access[role.value as RoleValue] !== false,
                );

                return (
                  <div key={role.value}>
                    <button
                      type="button"
                      onClick={() => setExpandedRole(isExpanded ? null : role.value)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors min-h-[52px] text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${role.color}`}
                        >
                          {role.label}
                        </span>
                        <span className="text-sm text-gray-600 hidden sm:block">
                          {role.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {matrixRows.length} feature{matrixRows.length !== 1 ? "s" : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 pt-3 pb-2 sm:hidden">
                          {role.description}
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2 pt-3">
                          {/* Feature access */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                              Feature access
                            </p>
                            <ul className="space-y-1">
                              {matrixRows.map((row) => (
                                <li
                                  key={row.feature}
                                  className="flex items-center gap-2 text-sm text-gray-700"
                                >
                                  {row.access[role.value as RoleValue] === "read" ? (
                                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                                      <span className="text-xs font-bold text-amber-500">V</span>
                                    </span>
                                  ) : (
                                    <Check
                                      className="w-3.5 h-3.5 flex-shrink-0"
                                      style={{ color: "#1D9E75" }}
                                    />
                                  )}
                                  {row.feature}
                                  {row.access[role.value as RoleValue] === "read" && (
                                    <span className="text-xs text-amber-600">(view only)</span>
                                  )}
                                </li>
                              ))}
                              {matrixRows.length === 0 && (
                                <li className="text-sm text-gray-400">No feature access</li>
                              )}
                            </ul>
                          </div>

                          {/* Adoni capabilities */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3" style={{ color: "#1D9E75" }} />
                              Adoni capabilities
                            </p>
                            <ul className="space-y-1">
                              {adoniCaps.map((cap) => (
                                <li
                                  key={cap.capability}
                                  className="flex items-center gap-2 text-sm text-gray-700"
                                >
                                  <Check
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    style={{ color: "#1D9E75" }}
                                  />
                                  {cap.capability}
                                </li>
                              ))}
                              {adoniCaps.length === 0 && (
                                <li className="text-sm text-gray-400">No Adoni access</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
