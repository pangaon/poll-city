"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronDown, ChevronRight, FileText, MessageSquare,
  Trash2, GitBranch, BookOpen, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FieldHelp, FeatureGuide } from "@/components/ui";

/* ─── Brand colours ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Script {
  id: string;
  name: string;
  scriptType: string;
  openingLine: string;
  keyMessages: string[];
  issueResponses: Record<string, string> | null;
  closingAsk: string;
  literature: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type ScriptType = "general" | "supporter" | "persuadable" | "opposition";

const SCRIPT_TYPE_CONFIG: Record<ScriptType, { label: string; color: string; bg: string; description: string }> = {
  general: { label: "General", color: "text-blue-700", bg: "bg-blue-100", description: "Default script for unknown voters" },
  supporter: { label: "Supporter", color: "text-emerald-700", bg: "bg-emerald-100", description: "For confirmed or leaning supporters" },
  persuadable: { label: "Persuadable", color: "text-amber-700", bg: "bg-amber-100", description: "For undecided voters who may be swayed" },
  opposition: { label: "Opposition", color: "text-red-700", bg: "bg-red-100", description: "For voters leaning against -- brief and respectful" },
};

/* ─── Branch Logic Data ─────────────────────────────────────────────────────── */

interface BranchNode {
  id: string;
  question: string;
  responses: { label: string; next: string | null; color: string }[];
}

const DEFAULT_BRANCH_LOGIC: BranchNode[] = [
  {
    id: "intro",
    question: "Opening: Introduce yourself and candidate",
    responses: [
      { label: "Interested (proceed)", next: "support_check", color: "bg-green-100 text-green-700" },
      { label: "Not interested", next: "polite_close", color: "bg-gray-100 text-gray-600" },
      { label: "Not home", next: null, color: "bg-gray-200 text-gray-500" },
    ],
  },
  {
    id: "support_check",
    question: "Ask: Have you decided who you're voting for?",
    responses: [
      { label: "Supporting us", next: "supporter_ask", color: "bg-emerald-100 text-emerald-700" },
      { label: "Undecided", next: "issue_probe", color: "bg-amber-100 text-amber-700" },
      { label: "Supporting opponent", next: "polite_close", color: "bg-red-100 text-red-700" },
    ],
  },
  {
    id: "issue_probe",
    question: "Ask: What issues matter most to you?",
    responses: [
      { label: "Connected to platform", next: "supporter_ask", color: "bg-green-100 text-green-700" },
      { label: "Still undecided", next: "leave_info", color: "bg-amber-100 text-amber-700" },
      { label: "Disagrees", next: "polite_close", color: "bg-red-100 text-red-700" },
    ],
  },
  {
    id: "supporter_ask",
    question: "Ask: Can we count on your vote? Sign? Volunteer?",
    responses: [
      { label: "Yes to all", next: null, color: "bg-emerald-100 text-emerald-700" },
      { label: "Vote only", next: null, color: "bg-green-100 text-green-700" },
      { label: "Maybe", next: null, color: "bg-amber-100 text-amber-700" },
    ],
  },
  {
    id: "leave_info",
    question: "Leave literature and thank them",
    responses: [
      { label: "Accepted", next: null, color: "bg-blue-100 text-blue-700" },
      { label: "Declined", next: null, color: "bg-gray-100 text-gray-600" },
    ],
  },
  {
    id: "polite_close",
    question: "Thank them for their time, leave literature if accepted",
    responses: [
      { label: "Done", next: null, color: "bg-gray-100 text-gray-600" },
    ],
  },
];

/* ─── Shimmer Skeleton ──────────────────────────────────────────────────────── */

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gray-200", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ScriptsClient({ campaignId }: { campaignId: string }) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "branches">("library");
  const [activeBranch, setActiveBranch] = useState<string | null>("intro");

  const [form, setForm] = useState({
    name: "",
    scriptType: "general" as ScriptType,
    openingLine: "",
    keyMessages: "",
    issueResponses: "",
    closingAsk: "",
    literature: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/canvassing/scripts?campaignId=${campaignId}`);
      const data = await res.json();
      setScripts(data.data ?? []);
    } catch {
      toast.error("Failed to load scripts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function createScript() {
    if (!form.name.trim() || !form.openingLine.trim() || !form.closingAsk.trim()) {
      toast.error("Name, opening line, and closing ask are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/canvassing/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          scriptType: form.scriptType,
          openingLine: form.openingLine,
          keyMessages: form.keyMessages.split("\n").filter(Boolean),
          issueResponses: form.issueResponses
            ? Object.fromEntries(
                form.issueResponses
                  .split("\n")
                  .filter((l) => l.includes(":"))
                  .map((line) => {
                    const [k, ...rest] = line.split(":");
                    return [k?.trim() || "Issue", rest.join(":").trim()];
                  }),
              )
            : {},
          closingAsk: form.closingAsk,
          literature: form.literature || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Script created");
        setForm({ name: "", scriptType: "general", openingLine: "", keyMessages: "", issueResponses: "", closingAsk: "", literature: "" });
        setShowCreate(false);
        load();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to create script");
      }
    } finally {
      setSaving(false);
    }
  }

  // Group scripts by type
  const grouped = scripts.reduce<Record<string, Script[]>>((acc, s) => {
    const t = s.scriptType || "general";
    if (!acc[t]) acc[t] = [];
    acc[t].push(s);
    return acc;
  }, {});

  const TABS = [
    { id: "library" as const, icon: BookOpen, label: "Script Library" },
    { id: "branches" as const, icon: GitBranch, label: "Branch Logic" },
  ];

  return (
    <div className="space-y-6">
      <FeatureGuide
        featureKey="canvassing-scripts"
        title="What are Canvassing Scripts?"
        description="A canvassing script is the conversation guide your volunteers follow when they knock on doors. A good script opens the conversation, identifies the voter's support level, and closes with a clear ask — all in under 90 seconds."
        bullets={[
          "Create different scripts for different voters: undecided, soft support, opposition",
          "Volunteers see the script on their phones at each door",
          "Track which responses are recorded most to refine your message over time",
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Canvassing Scripts</h1>
          <p className="text-sm text-gray-500">Scripts per support level, issue responses, and branch logic for door conversations.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
          style={{ backgroundColor: NAVY }}
        >
          <Plus className="w-4 h-4" /> New Script
        </motion.button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
              activeTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Create Script Form ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="bg-white border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Create New Script</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Script Name <span className="text-red-500">*</span>
                  <FieldHelp content="The name canvassers will see when they open their door-knock app. Keep it short and recognisable." example="General Introduction" tip="Keep it short — canvassers see this on a phone screen." />
                </label>
                <input
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. General Introduction"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  Support Level
                  <FieldHelp content="Which voters this script is designed for. The canvasser app automatically suggests the right script based on the voter's recorded support level." />
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(SCRIPT_TYPE_CONFIG) as [ScriptType, typeof SCRIPT_TYPE_CONFIG[ScriptType]][]).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setForm((s) => ({ ...s, scriptType: type }))}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all min-h-[44px]",
                        form.scriptType === type
                          ? `${config.bg} ${config.color} border-current`
                          : "bg-white text-gray-500 border-gray-200",
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{SCRIPT_TYPE_CONFIG[form.scriptType].description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Opening Line <span className="text-red-500">*</span>
                  <FieldHelp content="The first thing the canvasser says at the door. Sets the tone for the entire conversation. Make it warm and personal." example="Hi, I'm [Name], a volunteer for [Candidate]. Can I take 2 minutes of your time?" />
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder={`Hi, I'm [Name], a volunteer for [Candidate]. Can I take 2 minutes of your time?`}
                  value={form.openingLine}
                  onChange={(e) => setForm((s) => ({ ...s, openingLine: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Key Messages (one per line)
                  <FieldHelp content="The 2–4 main points the canvasser should communicate. These appear as a checklist during the conversation so nothing gets missed." example={"Lower property taxes\nBetter transit\nAffordable childcare"} tip="Keep each message to one sentence — canvassers need to say it out loud." />
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder={"Lower property taxes\nBetter transit service\nAffordable childcare"}
                  value={form.keyMessages}
                  onChange={(e) => setForm((s) => ({ ...s, keyMessages: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Issue Responses (issue:response, one per line)
                  <FieldHelp content="Pre-written responses to common voter concerns. The canvasser sees these if a voter raises a specific issue. Format: Issue: Your response." example={"Taxes: We plan to freeze property taxes for 2 years\nTransit: Our candidate supports expanding bus routes"} />
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder={"Taxes: We plan to freeze property taxes for 2 years\nTransit: Our candidate supports expanding bus routes"}
                  value={form.issueResponses}
                  onChange={(e) => setForm((s) => ({ ...s, issueResponses: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Closing Ask <span className="text-red-500">*</span>
                  <FieldHelp content="The specific ask the canvasser makes before leaving. This is the most important part of the conversation — be direct and confident." example="Can we count on your vote on election day?" tip="Ask for something specific: a vote, a sign, a volunteer shift." />
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder={`Can we count on your vote on election day?`}
                  value={form.closingAsk}
                  onChange={(e) => setForm((s) => ({ ...s, closingAsk: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Leave-behind Literature
                  <FieldHelp content="What printed material the canvasser should leave at the door. Reminds them which piece to hand out for this voter type." example="Campaign brochure" tip="Use different literature for supporters vs. undecided voters." />
                </label>
                <input
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Campaign brochure, platform summary card"
                  value={form.literature}
                  onChange={(e) => setForm((s) => ({ ...s, literature: e.target.value }))}
                />
              </div>

              <button
                onClick={createScript}
                disabled={saving}
                className="w-full py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                style={{ backgroundColor: NAVY }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Creating..." : "Create Script"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Script Library Tab ── */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="h-20" />)}
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-2xl">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No scripts created yet</p>
              <p className="text-sm mt-1">Create scripts for different support levels to guide canvassers</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-xl min-h-[44px]"
                style={{ backgroundColor: NAVY }}
              >
                Create First Script
              </button>
            </div>
          ) : (
            (Object.entries(SCRIPT_TYPE_CONFIG) as [ScriptType, typeof SCRIPT_TYPE_CONFIG[ScriptType]][]).map(([type, config]) => {
              const typeScripts = grouped[type] ?? [];
              if (typeScripts.length === 0) return null;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", config.bg, config.color)}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-400">{typeScripts.length} script{typeScripts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-3">
                    {typeScripts.map((script) => (
                      <ScriptCard
                        key={script.id}
                        script={script}
                        isExpanded={expandedScript === script.id}
                        onToggle={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                        typeConfig={config}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Branch Logic Tab ── */}
      {activeTab === "branches" && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5">
            <h2 className="font-bold text-gray-900 mb-1">Conversation Flow</h2>
            <p className="text-sm text-gray-500 mb-4">Visual guide for canvassers showing how to navigate door conversations based on voter responses.</p>

            {/* Branch flow */}
            <div className="space-y-3">
              {DEFAULT_BRANCH_LOGIC.map((node, idx) => {
                const isActive = activeBranch === node.id;
                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <button
                      onClick={() => setActiveBranch(isActive ? null : node.id)}
                      className={cn(
                        "w-full text-left border rounded-xl p-4 transition-all",
                        isActive ? "border-blue-300 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:bg-gray-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: NAVY }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{node.question}</p>
                        </div>
                        {isActive ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-11 mt-2 space-y-1.5">
                            {node.responses.map((resp) => (
                              <div
                                key={resp.label}
                                className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium", resp.color)}
                              >
                                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{resp.label}</span>
                                {resp.next && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveBranch(resp.next); }}
                                    className="ml-auto text-xs underline opacity-60 hover:opacity-100"
                                  >
                                    Go to step
                                  </button>
                                )}
                                {!resp.next && <span className="ml-auto text-xs opacity-50">End</span>}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Branch logic diagram key */}
          <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">How to use</p>
            <p>Each step presents a question or action. Tap a step to see possible voter responses and where they lead. Green responses indicate supporter paths, amber indicates persuadable, and red indicates opposition or end of conversation.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Script Card ───────────────────────────────────────────────────────────── */

function ScriptCard({
  script,
  isExpanded,
  onToggle,
  typeConfig,
}: {
  script: Script;
  isExpanded: boolean;
  onToggle: () => void;
  typeConfig: { label: string; color: string; bg: string };
}) {
  const issueEntries = script.issueResponses ? Object.entries(script.issueResponses as Record<string, string>) : [];

  return (
    <div className="bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center gap-3 min-h-[44px]">
        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{script.name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{script.openingLine}</p>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
              {/* Opening */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Opening</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-3 leading-relaxed italic">
                  &ldquo;{script.openingLine}&rdquo;
                </p>
              </div>

              {/* Key Messages */}
              {script.keyMessages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Messages</p>
                  <ul className="space-y-1.5">
                    {script.keyMessages.map((msg, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: "#EFF6FF", color: NAVY }}>
                          {i + 1}
                        </span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issue Responses */}
              {issueEntries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issue-Specific Responses</p>
                  <div className="space-y-2">
                    {issueEntries.map(([issue, response]) => (
                      <div key={issue} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-amber-800 mb-1">If they ask about: {issue}</p>
                        <p className="text-sm text-amber-900">{response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Closing Ask</p>
                <p className="text-sm text-gray-800 bg-green-50 border border-green-100 rounded-xl p-3 leading-relaxed italic">
                  &ldquo;{script.closingAsk}&rdquo;
                </p>
              </div>

              {/* Literature */}
              {script.literature && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Leave behind: <span className="font-medium text-gray-700">{script.literature}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
