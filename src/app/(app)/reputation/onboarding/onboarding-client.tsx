"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bell, CheckCircle2, ChevronRight, Globe, Lightbulb,
  Megaphone, Shield, Siren, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui";

interface Props { campaignId: string; }

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const STEPS = ["Organization", "Monitoring", "Preferences", "Team", "Demo"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingClient({ campaignId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("Organization");
  const [done, setDone] = useState(false);

  // Form state
  const [org, setOrg] = useState({ mode: "campaign", candidateName: "", geography: "", officeType: "", keyIssues: "" });
  const [monitoring, setMonitoring] = useState({
    keywords: [] as string[], customKeyword: "", geoFocus: "", sources: ["social_media","news","blog"],
  });
  const [prefs, setPrefs] = useState({
    defaultSlaHours: "24", escalationThreshold: "high", sensitiveCategories: [] as string[],
  });
  const [simRunning, setSimRunning] = useState(false);
  const [simDone, setSimDone] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const addKeyword = () => {
    const kw = monitoring.customKeyword.trim();
    if (kw && !monitoring.keywords.includes(kw)) {
      setMonitoring((m) => ({ ...m, keywords: [...m.keywords, kw], customKeyword: "" }));
    }
  };

  const runDemo = async () => {
    setSimRunning(true);
    await fetch("/api/reputation/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    setTimeout(() => {
      setSimRunning(false);
      setSimDone(true);
    }, 1500);
  };

  const finish = () => {
    router.push(`/reputation/alerts?campaignId=${campaignId}`);
  };

  const suggestedKeywords = org.candidateName
    ? [org.candidateName, `${org.candidateName} campaign`, org.geography, ...["housing","transit","taxes","safety"]].filter(Boolean)
    : ["candidate name", "ward election", "policy issue"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: NAVY }} />
            <h1 className="text-lg font-semibold text-gray-900">Reputation Command Setup</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Step {stepIndex + 1} of {totalSteps}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: NAVY }}
            initial={{ width: 0 }}
            animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }} />
        </div>
        <div className="flex mt-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 text-center text-xs transition ${i <= stepIndex ? "text-gray-700 font-medium" : "text-gray-400"}`}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Organization */}
            {step === "Organization" && (
              <motion.div key="org" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-1">Organisation Basics</h2>
                  <p className="text-sm text-gray-500 mb-5">Tell us about your campaign or office so we can set up the right monitoring profile.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
                      <div className="flex gap-3">
                        {(["campaign","elected_office"] as const).map((m) => (
                          <button key={m} onClick={() => setOrg((o) => ({ ...o, mode: m }))}
                            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition ${org.mode === m ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                            {m === "campaign" ? "🗳 Campaign" : "🏛 Elected Office"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Candidate / Official Name *</label>
                      <input value={org.candidateName} onChange={(e) => setOrg((o) => ({ ...o, candidateName: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="e.g. Jane Smith" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Geography</label>
                        <input value={org.geography} onChange={(e) => setOrg((o) => ({ ...o, geography: e.target.value }))}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                          placeholder="e.g. Ward 3, Ottawa" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Office / Position</label>
                        <input value={org.officeType} onChange={(e) => setOrg((o) => ({ ...o, officeType: e.target.value }))}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                          placeholder="e.g. City Councillor" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Key Issues (comma-separated)</label>
                      <input value={org.keyIssues} onChange={(e) => setOrg((o) => ({ ...o, keyIssues: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                        placeholder="e.g. housing, transit, public safety" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={next} disabled={!org.candidateName} style={{ background: NAVY }} className="gap-1">
                    Continue <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Monitoring */}
            {step === "Monitoring" && (
              <motion.div key="mon" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-1">Monitoring Setup</h2>
                  <p className="text-sm text-gray-500 mb-5">Configure what signals to watch for. We&apos;ll suggest keywords based on your profile.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Suggested Keywords</label>
                      <div className="flex flex-wrap gap-2">
                        {suggestedKeywords.map((kw) => (
                          <button key={kw} onClick={() => {
                            if (!monitoring.keywords.includes(kw)) {
                              setMonitoring((m) => ({ ...m, keywords: [...m.keywords, kw] }));
                            }
                          }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${monitoring.keywords.includes(kw) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                            {monitoring.keywords.includes(kw) ? "✓ " : "+ "}{kw}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Custom Keyword</label>
                      <div className="flex gap-2">
                        <input value={monitoring.customKeyword}
                          onChange={(e) => setMonitoring((m) => ({ ...m, customKeyword: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                          className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                          placeholder="Add keyword…" />
                        <Button variant="outline" size="sm" onClick={addKeyword}>Add</Button>
                      </div>
                    </div>
                    {monitoring.keywords.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Active Keywords ({monitoring.keywords.length})</label>
                        <div className="flex flex-wrap gap-1.5">
                          {monitoring.keywords.map((kw) => (
                            <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                              {kw}
                              <button onClick={() => setMonitoring((m) => ({ ...m, keywords: m.keywords.filter((k) => k !== kw) }))}
                                className="hover:text-indigo-900">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Geography Focus</label>
                      <input value={monitoring.geoFocus}
                        onChange={(e) => setMonitoring((m) => ({ ...m, geoFocus: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none"
                        placeholder="e.g. Ward 3, Toronto, Ontario" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep("Organization")}>Back</Button>
                  <Button onClick={next} style={{ background: NAVY }} className="gap-1">
                    Continue <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Preferences */}
            {step === "Preferences" && (
              <motion.div key="prefs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-1">Response Preferences</h2>
                  <p className="text-sm text-gray-500 mb-5">Set default response windows and escalation thresholds.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Default Response SLA</label>
                      <select value={prefs.defaultSlaHours}
                        onChange={(e) => setPrefs((p) => ({ ...p, defaultSlaHours: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                        <option value="1">1 hour — crisis mode</option>
                        <option value="4">4 hours — fast response</option>
                        <option value="24">24 hours — standard</option>
                        <option value="72">72 hours — relaxed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Auto-Escalation Threshold</label>
                      <select value={prefs.escalationThreshold}
                        onChange={(e) => setPrefs((p) => ({ ...p, escalationThreshold: e.target.value }))}
                        className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm focus:outline-none">
                        <option value="critical">Critical only</option>
                        <option value="high">High and above</option>
                        <option value="medium">Medium and above</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Sensitive Categories (require approval)</label>
                      <div className="flex flex-wrap gap-2">
                        {["legal","financial","personal_attack","misinformation"].map((cat) => (
                          <button key={cat} onClick={() => setPrefs((p) => ({
                            ...p, sensitiveCategories: p.sensitiveCategories.includes(cat)
                              ? p.sensitiveCategories.filter((c) => c !== cat)
                              : [...p.sensitiveCategories, cat],
                          }))}
                            className={`text-xs px-3 py-1.5 rounded-full border transition ${prefs.sensitiveCategories.includes(cat) ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                            {cat.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep("Monitoring")}>Back</Button>
                  <Button onClick={next} style={{ background: NAVY }} className="gap-1">
                    Continue <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Team */}
            {step === "Team" && (
              <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-1">Team Roles</h2>
                  <p className="text-sm text-gray-500 mb-5">Assign who owns what in the reputation response flow.</p>
                  <div className="space-y-3">
                    {[
                      { role: "Issue Owner", desc: "First to be alerted when a new issue opens", icon: Shield },
                      { role: "Approver", desc: "Reviews and approves outbound response actions", icon: CheckCircle2 },
                      { role: "Comms Lead", desc: "Executes approved responses across channels", icon: Megaphone },
                    ].map(({ role, desc, icon: Icon }) => (
                      <div key={role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: NAVY }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{role}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <span className="text-xs text-gray-400">Assigned via Permissions</span>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 text-center pt-1">
                      Role assignments are managed in Settings → Permissions
                    </p>
                  </div>
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep("Preferences")}>Back</Button>
                  <Button onClick={next} style={{ background: NAVY }} className="gap-1">
                    Continue <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Demo */}
            {step === "Demo" && (
              <motion.div key="demo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold mb-1">See It in Action</h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Run a simulation to see the full alert → issue → recommendation → response flow.
                  </p>

                  {!simDone ? (
                    <div className="text-center py-6">
                      <Siren className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: NAVY }} />
                      <p className="text-sm text-gray-600 mb-6">
                        We&apos;ll inject two demo alerts — a social media spike and a news mention — then show you how the command center responds.
                      </p>
                      <Button onClick={runDemo} disabled={simRunning} style={{ background: NAVY }}
                        className="gap-2 mx-auto">
                        <Zap className="w-4 h-4" />
                        {simRunning ? "Running simulation…" : "Run Demo Simulation"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { icon: Bell, label: "2 demo alerts created", color: AMBER },
                        { icon: Shield, label: "Issues auto-generated in Command Center", color: NAVY },
                        { icon: Lightbulb, label: "Recommendations engine fired", color: "#6366f1" },
                        { icon: CheckCircle2, label: "You're ready to respond", color: GREEN },
                      ].map(({ icon: Icon, label, color }) => (
                        <motion.div key={label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                          <span className="text-sm text-gray-700">{label}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep("Team")}>Back</Button>
                  <Button onClick={finish} style={{ background: GREEN }} className="gap-1" disabled={!simDone}>
                    <ArrowRight className="w-3.5 h-3.5" /> Go to Command Center
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>;
}
