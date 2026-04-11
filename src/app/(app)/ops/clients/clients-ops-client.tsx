"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Plus, RefreshCw, ArrowRight, Loader2, Mail, AlertTriangle,
  CheckCircle, Clock, Users, BarChart2, Calendar, X, Send, RotateCcw,
  Wifi, WifiOff, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ElectionType } from "@prisma/client";

/* ── palette ─────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ───────────────────────────────────────────────────────── */
interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  candidateName: string | null;
  electionType: string;
  electionDate: string | null;
  daysToElection: number | null;
  isActive: boolean;
  tier: string;
  createdAt: string;
  lastActivity: string | null;
  memberCount: number;
  contactCount: number;
  adminEmail: string | null;
  onboardingComplete: boolean;
  onboardingProgress: number;
  healthIndicator: "green" | "amber" | "red";
  featuresUsed: string[];
  electionSoon: boolean;
  inviteStatus: "none" | "pending" | "accepted";
  pendingInviteExpiresAt: string | null;
}

type ProvisionStage = "idle" | "submitting" | "success" | "error";

interface ProvisionForm {
  candidateName: string;
  campaignName: string;
  adminEmail: string;
  electionType: ElectionType;
  electionDate: string;
  jurisdiction: string;
}

const EMPTY_FORM: ProvisionForm = {
  candidateName: "",
  campaignName: "",
  adminEmail: "",
  electionType: ElectionType.municipal,
  electionDate: "",
  jurisdiction: "",
};

/* ── helpers ─────────────────────────────────────────────────────── */
function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function electionCountdown(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

const HEALTH_CONFIG = {
  green:  { dot: GREEN,  bg: "bg-emerald-50", text: "text-emerald-700", label: "On Track" },
  amber:  { dot: AMBER,  bg: "bg-amber-50",   text: "text-amber-700",   label: "Needs Attention" },
  red:    { dot: RED,    bg: "bg-red-50",      text: "text-red-700",     label: "Action Required" },
};

/* ── attention queue logic ────────────────────────────────────────── */
function needsAttention(c: ClientRecord): string | null {
  if (c.healthIndicator === "red") return "Health critical";
  if (!c.onboardingComplete) {
    const hoursSinceCreate = (Date.now() - new Date(c.createdAt).getTime()) / 3600000;
    if (hoursSinceCreate > 48) return "Setup not completed";
  }
  if (c.electionSoon && c.contactCount < 100) return "Election soon, low contacts";
  if (c.inviteStatus === "pending") {
    const hoursLeft = c.pendingInviteExpiresAt
      ? (new Date(c.pendingInviteExpiresAt).getTime() - Date.now()) / 3600000
      : null;
    if (hoursLeft !== null && hoursLeft < 48) return "Invite expiring soon";
  }
  return null;
}

/* ── main component ──────────────────────────────────────────────── */
export default function ClientsOpsClient() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProvision, setShowProvision] = useState(false);
  const [form, setForm] = useState<ProvisionForm>(EMPTY_FORM);
  const [provisionStage, setProvisionStage] = useState<ProvisionStage>("idle");
  const [provisionResult, setProvisionResult] = useState<{ emailSent: boolean; inviteUrl?: string | null; campaignName: string } | null>(null);
  const [provisionError, setProvisionError] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "attention" | "active" | "incomplete">("all");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/clients");
      if (res.ok) {
        const json = await res.json() as { data: ClientRecord[] };
        setClients(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadClients(); }, [loadClients]);

  function setField(k: keyof ProvisionForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (provisionError) setProvisionError("");
  }

  // Auto-fill campaign name when candidate name changes
  function setCandidateName(v: string) {
    setForm((f) => ({
      ...f,
      candidateName: v,
      campaignName: f.campaignName || (v ? `${v} Campaign` : ""),
    }));
  }

  async function handleProvision(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidateName || !form.campaignName || !form.adminEmail) {
      setProvisionError("Candidate name, campaign name, and email are required.");
      return;
    }
    setProvisionStage("submitting");

    const res = await fetch("/api/ops/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateName: form.candidateName,
        campaignName: form.campaignName,
        adminEmail: form.adminEmail,
        electionType: form.electionType,
        electionDate: form.electionDate || null,
        jurisdiction: form.jurisdiction || undefined,
      }),
    });

    const data = await res.json().catch(() => ({})) as {
      data?: { campaign: { name: string }; emailSent: boolean; inviteUrl?: string | null };
      error?: string;
    };

    if (!res.ok) {
      setProvisionError(data.error ?? "Provision failed. Please try again.");
      setProvisionStage("error");
      return;
    }

    setProvisionResult({
      campaignName: data.data!.campaign.name,
      emailSent: data.data!.emailSent,
      inviteUrl: data.data!.inviteUrl,
    });
    setProvisionStage("success");
    void loadClients();
  }

  async function handleResendInvite(campaignId: string) {
    setResendingId(campaignId);
    try {
      const res = await fetch(`/api/ops/provision/${campaignId}/resend-invite`, { method: "POST" });
      const data = await res.json().catch(() => ({})) as { data?: { emailSent: boolean; inviteUrl?: string | null }; error?: string };
      if (!res.ok) {
        alert(data.error ?? "Failed to resend invite.");
        return;
      }
      if (!data.data?.emailSent && data.data?.inviteUrl) {
        // Copy invite URL to clipboard as fallback
        await navigator.clipboard.writeText(data.data.inviteUrl).catch(() => {});
        alert(`Resend email failed. Invite link copied to clipboard:\n${data.data.inviteUrl}`);
      } else {
        alert("Invite resent successfully.");
      }
      void loadClients();
    } finally {
      setResendingId(null);
    }
  }

  async function handleEnter(campaignId: string) {
    setEnteringId(campaignId);
    try {
      const res = await fetch("/api/campaigns/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(d.error ?? "Failed to switch campaign");
        setEnteringId(null);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      alert("Network error. Please try again.");
      setEnteringId(null);
    }
  }

  function closeProvision() {
    setShowProvision(false);
    setForm(EMPTY_FORM);
    setProvisionStage("idle");
    setProvisionResult(null);
    setProvisionError("");
  }

  // Derived data
  const attentionClients = clients.filter((c) => needsAttention(c) !== null);
  const filtered = filter === "all" ? clients
    : filter === "attention" ? attentionClients
    : filter === "active" ? clients.filter((c) => c.isActive)
    : clients.filter((c) => !c.onboardingComplete);

  const totalContacts = clients.reduce((s, c) => s + c.contactCount, 0);
  const totalActive = clients.filter((c) => c.isActive).length;
  const incompleteOnboarding = clients.filter((c) => !c.onboardingComplete).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Client Manager</h1>
          <p className="text-sm text-gray-500">Provision, monitor, and manage every campaign on the platform.</p>
        </div>
        <button onClick={() => void loadClients()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => setShowProvision(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: GREEN }}
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length, icon: Crown, color: NAVY },
          { label: "Active Campaigns", value: totalActive, icon: Activity, color: GREEN },
          { label: "Total Contacts", value: totalContacts.toLocaleString(), icon: Users, color: "#6366f1" },
          { label: "Incomplete Setup", value: incompleteOnboarding, icon: AlertTriangle, color: incompleteOnboarding > 0 ? AMBER : GREEN },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}1a` }}>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attention Queue */}
      <AnimatePresence>
        {attentionClients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">
                Attention Queue — {attentionClients.length} client{attentionClients.length !== 1 ? "s" : ""} need action
              </h2>
            </div>
            <div className="space-y-2">
              {attentionClients.map((c) => {
                const reason = needsAttention(c)!;
                return (
                  <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-amber-100">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: HEALTH_CONFIG[c.healthIndicator].dot }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate block">{c.name}</span>
                      <span className="text-xs text-amber-700">{reason}</span>
                    </div>
                    {c.inviteStatus === "pending" && (
                      <button
                        onClick={() => void handleResendInvite(c.id)}
                        disabled={resendingId === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors disabled:opacity-50"
                      >
                        {resendingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Resend Invite
                      </button>
                    )}
                    <button
                      onClick={() => void handleEnter(c.id)}
                      disabled={enteringId !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                      style={{ background: NAVY }}
                    >
                      {enteringId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                      Enter
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {([
          ["all", "All Clients", clients.length],
          ["attention", "Needs Action", attentionClients.length],
          ["active", "Active", totalActive],
          ["incomplete", "Setup Incomplete", incompleteOnboarding],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              filter === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                filter === id ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Client table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Crown className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No clients in this view</p>
          {clients.length === 0 && (
            <button
              onClick={() => setShowProvision(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white mx-auto transition-colors"
              style={{ background: GREEN }}
            >
              <Plus className="w-4 h-4" /> Provision your first client
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => <ClientRow key={c.id} client={c} enteringId={enteringId} resendingId={resendingId} onEnter={handleEnter} onResend={handleResendInvite} />)}
        </div>
      )}

      {/* Provision modal */}
      <AnimatePresence>
        {showProvision && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={provisionStage !== "submitting" ? closeProvision : undefined}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={spring}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GREEN}1a` }}>
                    <Plus className="w-4 h-4" style={{ color: GREEN }} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-gray-900">Provision New Client</h2>
                    <p className="text-xs text-gray-500">Creates campaign + account + sends invite email</p>
                  </div>
                  {provisionStage !== "submitting" && (
                    <button onClick={closeProvision} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Success state */}
                {provisionStage === "success" && provisionResult && (
                  <div className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {provisionResult.campaignName} is live
                    </h3>
                    {provisionResult.emailSent ? (
                      <p className="text-sm text-gray-600 mb-4">
                        Invite email sent. They&apos;ll receive a link to activate their account and start setup.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-3">
                          Campaign created but email was not sent (Resend not configured).
                          Share this link manually:
                        </p>
                        {provisionResult.inviteUrl && (
                          <div className="flex gap-2 mb-4">
                            <input
                              readOnly
                              value={provisionResult.inviteUrl}
                              className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 min-w-0"
                            />
                            <button
                              onClick={() => navigator.clipboard.writeText(provisionResult.inviteUrl!).catch(() => {})}
                              className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex-shrink-0"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setProvisionStage("idle"); setForm(EMPTY_FORM); setProvisionResult(null); }}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Provision Another
                      </button>
                      <button
                        onClick={closeProvision}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                        style={{ background: NAVY }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Form */}
                {(provisionStage === "idle" || provisionStage === "submitting" || provisionStage === "error") && (
                  <form onSubmit={handleProvision} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Candidate Name" required>
                        <input
                          value={form.candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="Jane Smith"
                          className="field-input"
                          disabled={provisionStage === "submitting"}
                        />
                      </FormField>
                      <FormField label="Admin Email" required>
                        <input
                          type="email"
                          value={form.adminEmail}
                          onChange={(e) => setField("adminEmail", e.target.value)}
                          placeholder="jane@campaign.ca"
                          className="field-input"
                          disabled={provisionStage === "submitting"}
                        />
                      </FormField>
                    </div>

                    <FormField label="Campaign Name" required>
                      <input
                        value={form.campaignName}
                        onChange={(e) => setField("campaignName", e.target.value)}
                        placeholder="Jane Smith for Mayor 2026"
                        className="field-input"
                        disabled={provisionStage === "submitting"}
                      />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Election Type">
                        <select
                          value={form.electionType}
                          onChange={(e) => setField("electionType", e.target.value)}
                          className="field-input"
                          disabled={provisionStage === "submitting"}
                        >
                          <option value="municipal">Municipal</option>
                          <option value="provincial">Provincial</option>
                          <option value="federal">Federal</option>
                          <option value="by_election">By-Election</option>
                          <option value="other">Other</option>
                        </select>
                      </FormField>
                      <FormField label="Election Date">
                        <input
                          type="date"
                          value={form.electionDate}
                          onChange={(e) => setField("electionDate", e.target.value)}
                          className="field-input"
                          disabled={provisionStage === "submitting"}
                        />
                      </FormField>
                    </div>

                    <FormField label="Jurisdiction">
                      <input
                        value={form.jurisdiction}
                        onChange={(e) => setField("jurisdiction", e.target.value)}
                        placeholder="Ward 5 — City of Toronto (optional)"
                        className="field-input"
                        disabled={provisionStage === "submitting"}
                      />
                    </FormField>

                    {provisionError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{provisionError}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeProvision}
                        disabled={provisionStage === "submitting"}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={provisionStage === "submitting"}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-70"
                        style={{ background: GREEN }}
                      >
                        {provisionStage === "submitting" ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning…</>
                        ) : (
                          <><Send className="w-4 h-4" /> Provision & Send Invite</>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: white;
          color: #111827;
        }
        .field-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .field-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/* ── ClientRow ───────────────────────────────────────────────────── */
function ClientRow({
  client: c,
  enteringId,
  resendingId,
  onEnter,
  onResend,
}: {
  client: ClientRecord;
  enteringId: string | null;
  resendingId: string | null;
  onEnter: (id: string) => void;
  onResend: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const h = HEALTH_CONFIG[c.healthIndicator];

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Health dot */}
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.dot }} />

        {/* Campaign name + candidate */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
          {c.candidateName && (
            <p className="text-xs text-gray-500 truncate">{c.candidateName}</p>
          )}
        </div>

        {/* Invite status */}
        {c.inviteStatus === "pending" && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" /> Invite Pending
          </span>
        )}
        {!c.onboardingComplete && c.inviteStatus === "accepted" && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Activity className="w-3 h-3" /> Setup {c.onboardingProgress}%
          </span>
        )}
        {c.onboardingComplete && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" /> Live
          </span>
        )}

        {/* Election countdown */}
        <span className="hidden md:block text-xs font-medium text-gray-500 w-16 text-right flex-shrink-0">
          <Calendar className="w-3 h-3 inline mr-1 text-gray-400" />
          {electionCountdown(c.daysToElection)}
        </span>

        {/* Enter button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEnter(c.id); }}
          disabled={enteringId !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0 transition-opacity disabled:opacity-50"
          style={{ background: NAVY }}
        >
          {enteringId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
          {enteringId === c.id ? "…" : "Enter"}
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-4">
              {/* Health + progress row */}
              <div className="flex flex-wrap gap-4">
                <DetailCard label="Health" value={h.label} bg={h.bg} textColor={h.text} />
                <DetailCard label="Contacts" value={c.contactCount.toLocaleString()} icon={<Users className="w-3 h-3" />} />
                <DetailCard label="Team" value={String(c.memberCount)} icon={<Users className="w-3 h-3" />} />
                <DetailCard label="Last Activity" value={relativeTime(c.lastActivity)} icon={<Clock className="w-3 h-3" />} />
                {c.adminEmail && (
                  <DetailCard label="Admin" value={c.adminEmail} icon={<Mail className="w-3 h-3" />} />
                )}
              </div>

              {/* Onboarding progress bar */}
              {!c.onboardingComplete && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Setup progress</span>
                    <span className="font-semibold">{c.onboardingProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.onboardingProgress}%`,
                        background: c.onboardingProgress >= 80 ? GREEN : c.onboardingProgress >= 40 ? AMBER : RED,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Features used */}
              {c.featuresUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.featuresUsed.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium capitalize">{f}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {c.inviteStatus === "pending" && (
                  <button
                    onClick={() => onResend(c.id)}
                    disabled={resendingId === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors disabled:opacity-50"
                  >
                    {resendingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Resend Invite
                  </button>
                )}
                <div className="flex-1" />
                {c.isActive
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600"><Wifi className="w-3 h-3" /> Active campaign</span>
                  : <span className="flex items-center gap-1 text-xs text-gray-400"><WifiOff className="w-3 h-3" /> Inactive</span>
                }
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailCard({ label, value, bg, textColor, icon }: {
  label: string; value: string; bg?: string; textColor?: string; icon?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg", bg ?? "bg-gray-50")}>
      {icon && <span className={textColor ?? "text-gray-400"}>{icon}</span>}
      <div>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className={cn("text-xs font-semibold", textColor ?? "text-gray-700")}>{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
