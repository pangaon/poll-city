"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronDown, ChevronRight, FileText, MessageSquare,
  GitBranch, BookOpen, X, Loader2, Edit3, Eye, Save,
  ArrowRight, Trash2, RotateCcw, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FieldHelp, FeatureGuide } from "@/components/ui";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface Script {
  id: string;
  name: string;
  scriptType: string;
  openingLine: string;
  keyMessages: string[];
  issueResponses: Record<string, string> | null;
  branchLogic: BranchFlow | null;
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

/* ─── Branch Logic Types ─────────────────────────────────────────────────────── */

interface BranchResponse {
  id: string;
  label: string;
  next: string | null;
}

interface BranchNode {
  id: string;
  prompt: string;
  responses: BranchResponse[];
}

interface BranchFlow {
  startNodeId: string;
  nodes: BranchNode[];
}

const RESPONSE_COLORS = [
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-red-50 text-red-800 border-red-200",
  "bg-blue-50 text-blue-800 border-blue-200",
  "bg-gray-50 text-gray-700 border-gray-200",
  "bg-purple-50 text-purple-800 border-purple-200",
  "bg-pink-50 text-pink-800 border-pink-200",
  "bg-indigo-50 text-indigo-800 border-indigo-200",
];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_FLOW: BranchFlow = {
  startNodeId: "intro",
  nodes: [
    {
      id: "intro",
      prompt: "Opening: Introduce yourself and candidate",
      responses: [
        { id: makeId(), label: "Interested — proceed", next: "support_check" },
        { id: makeId(), label: "Not interested", next: "polite_close" },
        { id: makeId(), label: "Not home", next: null },
      ],
    },
    {
      id: "support_check",
      prompt: "Ask: Have you decided who you're voting for?",
      responses: [
        { id: makeId(), label: "Supporting us", next: "supporter_ask" },
        { id: makeId(), label: "Undecided", next: "issue_probe" },
        { id: makeId(), label: "Supporting opponent", next: "polite_close" },
      ],
    },
    {
      id: "issue_probe",
      prompt: "Ask: What issues matter most to you?",
      responses: [
        { id: makeId(), label: "Connected to our platform", next: "supporter_ask" },
        { id: makeId(), label: "Still undecided", next: "leave_info" },
        { id: makeId(), label: "Disagrees with us", next: "polite_close" },
      ],
    },
    {
      id: "supporter_ask",
      prompt: "Ask: Can we count on your vote? Sign? Volunteer?",
      responses: [
        { id: makeId(), label: "Yes to everything", next: null },
        { id: makeId(), label: "Vote only", next: null },
        { id: makeId(), label: "Maybe — follow up later", next: null },
      ],
    },
    {
      id: "leave_info",
      prompt: "Leave literature and thank them",
      responses: [
        { id: makeId(), label: "Accepted literature", next: null },
        { id: makeId(), label: "Declined", next: null },
      ],
    },
    {
      id: "polite_close",
      prompt: "Thank them for their time, leave lit if accepted",
      responses: [
        { id: makeId(), label: "Done", next: null },
      ],
    },
  ],
};

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

  const load = useCallback(async () => {
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
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

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
                form.issueResponses.split("\n").filter((l) => l.includes(":")).map((line) => {
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
          "Build a branch logic flow to guide canvassers through any voter response",
        ]}
      />

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
                        form.scriptType === type ? `${config.bg} ${config.color} border-current` : "bg-white text-gray-500 border-gray-200",
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
                  <FieldHelp content="The first thing the canvasser says at the door. Sets the tone for the entire conversation." example="Hi, I'm [Name], a volunteer for [Candidate]. Can I take 2 minutes of your time?" />
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
                  <FieldHelp content="The 2–4 main points the canvasser should communicate. These appear as a checklist during the conversation." example={"Lower property taxes\nBetter transit\nAffordable childcare"} tip="Keep each message to one sentence." />
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
                  <FieldHelp content="Pre-written responses to common voter concerns." example={"Taxes: We plan to freeze property taxes for 2 years\nTransit: Our candidate supports expanding bus routes"} />
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
                  <FieldHelp content="The specific ask the canvasser makes before leaving. Be direct and confident." example="Can we count on your vote on election day?" tip="Ask for something specific: a vote, a sign, a volunteer shift." />
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
                  <FieldHelp content="What printed material the canvasser should leave at the door." example="Campaign brochure" />
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
                        onEditBranch={() => {
                          setActiveTab("branches");
                          setExpandedScript(script.id);
                        }}
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
        <BranchLogicEditor
          scripts={scripts}
          selectedScriptId={expandedScript}
          onSelectScript={setExpandedScript}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ─── Branch Logic Editor ───────────────────────────────────────────────────── */

function BranchLogicEditor({
  scripts,
  selectedScriptId,
  onSelectScript,
  onSaved,
}: {
  scripts: Script[];
  selectedScriptId: string | null;
  onSelectScript: (id: string | null) => void;
  onSaved: () => void;
}) {
  const script = scripts.find((s) => s.id === selectedScriptId) ?? scripts[0] ?? null;
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [flow, setFlow] = useState<BranchFlow>(script?.branchLogic ?? DEFAULT_FLOW);
  const [saving, setSaving] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string>(flow.startNodeId);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const f = script?.branchLogic ?? DEFAULT_FLOW;
    setFlow(f);
    setActiveNodeId(f.startNodeId);
    setHistory([]);
  }, [script?.id, script?.branchLogic]);

  const activeNode = flow.nodes.find((n) => n.id === activeNodeId) ?? flow.nodes[0];

  function handleResponse(nextId: string | null) {
    if (!nextId) return;
    setHistory((h) => [...h, activeNodeId]);
    setActiveNodeId(nextId);
  }

  function handleBack() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setActiveNodeId(prev);
  }

  function handleReset() {
    setActiveNodeId(flow.startNodeId);
    setHistory([]);
  }

  async function save() {
    if (!script) return;
    // Validate: every response.next that is non-null must exist in nodes
    const nodeIds = new Set(flow.nodes.map((n) => n.id));
    for (const node of flow.nodes) {
      for (const resp of node.responses) {
        if (resp.next && !nodeIds.has(resp.next)) {
          toast.error(`Response "${resp.label}" in "${node.prompt}" points to a node that doesn't exist`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/canvassing/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchLogic: flow }),
      });
      if (res.ok) {
        toast.success("Branch logic saved");
        onSaved();
        setMode("preview");
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  function addNode() {
    const id = `node_${makeId()}`;
    setFlow((f) => ({
      ...f,
      nodes: [
        ...f.nodes,
        {
          id,
          prompt: "New step",
          responses: [{ id: makeId(), label: "Continue", next: null }],
        },
      ],
    }));
  }

  function updateNode(nodeId: string, updates: Partial<BranchNode>) {
    setFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    }));
  }

  function deleteNode(nodeId: string) {
    if (flow.nodes.length <= 1) { toast.error("Cannot delete the last node"); return; }
    setFlow((f) => {
      const newNodes = f.nodes.filter((n) => n.id !== nodeId);
      const newStart = f.startNodeId === nodeId ? newNodes[0].id : f.startNodeId;
      // Clear any responses pointing to this deleted node
      return {
        startNodeId: newStart,
        nodes: newNodes.map((n) => ({
          ...n,
          responses: n.responses.map((r) => ({
            ...r,
            next: r.next === nodeId ? null : r.next,
          })),
        })),
      };
    });
  }

  function addResponse(nodeId: string) {
    setFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, responses: [...n.responses, { id: makeId(), label: "New response", next: null }] }
          : n
      ),
    }));
  }

  function updateResponse(nodeId: string, respId: string, updates: Partial<BranchResponse>) {
    setFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, responses: n.responses.map((r) => (r.id === respId ? { ...r, ...updates } : r)) }
          : n
      ),
    }));
  }

  function deleteResponse(nodeId: string, respId: string) {
    setFlow((f) => ({
      ...f,
      nodes: f.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, responses: n.responses.filter((r) => r.id !== respId) }
          : n
      ),
    }));
  }

  const isAtEnd = !activeNode || activeNode.responses.every((r) => !r.next);

  return (
    <div className="space-y-4">
      {/* Script selector + mode toggle */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Script
          </label>
          {scripts.length === 0 ? (
            <p className="text-sm text-gray-400">Create a script first to build branch logic.</p>
          ) : (
            <select
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={script?.id ?? ""}
              onChange={(e) => onSelectScript(e.target.value || null)}
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({SCRIPT_TYPE_CONFIG[s.scriptType as ScriptType]?.label ?? s.scriptType})</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all min-h-[44px]",
              mode === "preview" ? "bg-navy text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
            style={mode === "preview" ? { backgroundColor: NAVY } : {}}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={() => setMode("edit")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all min-h-[44px]",
              mode === "edit" ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
            style={mode === "edit" ? { backgroundColor: GREEN } : {}}
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* PREVIEW MODE — interactive walkthrough */}
      {mode === "preview" && script && (
        <div className="space-y-3">
          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Step {history.length + 1} of {flow.nodes.length}
                </p>
                <h2 className="font-bold text-gray-900 mt-0.5">{activeNode?.prompt}</h2>
              </div>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleBack}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-lg border"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded-lg border"
                >
                  <RotateCcw className="w-3 h-3" /> Restart
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1 bg-gray-100 rounded-full mb-5">
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((history.length + 1) / flow.nodes.length) * 100)}%`,
                  backgroundColor: GREEN,
                }}
              />
            </div>

            {isAtEnd ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: GREEN }} />
                <p className="font-semibold text-gray-900">Conversation complete</p>
                <p className="text-sm text-gray-500 mt-1">Record the interaction and move to the next door.</p>
                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ backgroundColor: NAVY }}
                >
                  Start over
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeNode?.responses.map((resp, i) => (
                  <motion.button
                    key={resp.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleResponse(resp.next)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all min-h-[44px]",
                      "flex items-center gap-2",
                      RESPONSE_COLORS[i % RESPONSE_COLORS.length],
                    )}
                  >
                    <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">{resp.label}</span>
                    {!resp.next && <span className="text-xs opacity-50 ml-auto">End</span>}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Flow overview */}
          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All Steps</p>
            <div className="space-y-1.5">
              {flow.nodes.map((node, idx) => {
                const isVisited = history.includes(node.id);
                const isCurrent = activeNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg",
                      isCurrent ? "bg-white border shadow-sm font-semibold text-gray-900" : isVisited ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ backgroundColor: isCurrent ? GREEN : isVisited ? "#9ca3af" : "#d1d5db", color: isVisited || isCurrent ? "white" : "#6b7280" }}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{node.prompt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODE — node editor */}
      {mode === "edit" && script && (
        <div className="space-y-3">
          {/* Start node selector */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <GitBranch className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-2 text-sm">
              <span className="text-amber-800 font-medium">Start node:</span>
              <select
                className="border-0 bg-transparent text-amber-900 font-semibold focus:outline-none"
                value={flow.startNodeId}
                onChange={(e) => setFlow((f) => ({ ...f, startNodeId: e.target.value }))}
              >
                {flow.nodes.map((n) => <option key={n.id} value={n.id}>{n.prompt.slice(0, 50)}</option>)}
              </select>
            </div>
          </div>

          {/* Node cards */}
          {flow.nodes.map((node, idx) => (
            <NodeEditor
              key={node.id}
              node={node}
              idx={idx}
              allNodes={flow.nodes}
              onUpdate={(updates) => updateNode(node.id, updates)}
              onDelete={() => deleteNode(node.id)}
              onAddResponse={() => addResponse(node.id)}
              onUpdateResponse={(rid, upd) => updateResponse(node.id, rid, upd)}
              onDeleteResponse={(rid) => deleteResponse(node.id, rid)}
            />
          ))}

          {/* Add node + Save */}
          <div className="flex gap-3">
            <button
              onClick={addNode}
              className="flex-1 py-3 text-sm font-medium border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
              style={{ backgroundColor: GREEN }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {!script && (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-2xl">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scripts yet</p>
          <p className="text-sm mt-1">Create at least one script to build branch logic</p>
        </div>
      )}
    </div>
  );
}

/* ─── Node Editor ───────────────────────────────────────────────────────────── */

function NodeEditor({
  node, idx, allNodes, onUpdate, onDelete, onAddResponse, onUpdateResponse, onDeleteResponse,
}: {
  node: BranchNode;
  idx: number;
  allNodes: BranchNode[];
  onUpdate: (updates: Partial<BranchNode>) => void;
  onDelete: () => void;
  onAddResponse: () => void;
  onUpdateResponse: (id: string, updates: Partial<BranchResponse>) => void;
  onDeleteResponse: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: NAVY }}
        >
          {idx + 1}
        </div>
        <input
          className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 min-w-0"
          value={node.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="Describe this conversation step..."
        />
        <div className="flex gap-1">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Voter responses</p>
              {node.responses.map((resp, i) => (
                <div key={resp.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm", RESPONSE_COLORS[i % RESPONSE_COLORS.length])}>
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                  <input
                    className="flex-1 bg-transparent border-0 focus:outline-none text-sm font-medium min-w-0"
                    value={resp.label}
                    onChange={(e) => onUpdateResponse(resp.id, { label: e.target.value })}
                    placeholder="Voter says..."
                  />
                  <span className="text-xs opacity-60 flex-shrink-0 mr-1">→</span>
                  <select
                    className="text-xs bg-transparent border-0 focus:outline-none cursor-pointer max-w-[140px]"
                    value={resp.next ?? ""}
                    onChange={(e) => onUpdateResponse(resp.id, { next: e.target.value || null })}
                  >
                    <option value="">End</option>
                    {allNodes.filter((n) => n.id !== node.id).map((n) => (
                      <option key={n.id} value={n.id}>{n.prompt.slice(0, 30)}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDeleteResponse(resp.id)}
                    className="text-current opacity-40 hover:opacity-80 flex-shrink-0 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={onAddResponse}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 pl-1 py-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add response
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Script Card ───────────────────────────────────────────────────────────── */

function ScriptCard({
  script, isExpanded, onToggle, typeConfig, onEditBranch,
}: {
  script: Script;
  isExpanded: boolean;
  onToggle: () => void;
  typeConfig: { label: string; color: string; bg: string };
  onEditBranch: () => void;
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
        {script.branchLogic && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">
            Flow saved
          </span>
        )}
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
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Opening</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl p-3 leading-relaxed italic">
                  &ldquo;{script.openingLine}&rdquo;
                </p>
              </div>

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

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Closing Ask</p>
                <p className="text-sm text-gray-800 bg-green-50 border border-green-100 rounded-xl p-3 leading-relaxed italic">
                  &ldquo;{script.closingAsk}&rdquo;
                </p>
              </div>

              {script.literature && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Leave behind: <span className="font-medium text-gray-700">{script.literature}</span>
                </div>
              )}

              <button
                onClick={onEditBranch}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border border-dashed text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
                {script.branchLogic ? "Edit branch logic" : "Add branch logic"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
