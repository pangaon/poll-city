"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Users, CreditCard, Rocket, Upload,
  ArrowRight, ExternalLink, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  campaignName: string;
  candidateName?: string;
  electionType: string;
  jurisdiction?: string;
  contactCount: number;
  memberCount: number;
  stripeOnboarded: boolean;
}

type StepId = "contacts" | "team" | "stripe" | "launch";

interface Step {
  id: StepId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  optional: boolean;
}

const STEPS: Step[] = [
  {
    id: "contacts",
    title: "Import your contacts",
    subtitle: "Upload your voter or supporter list to get started.",
    icon: Upload,
    optional: true,
  },
  {
    id: "team",
    title: "Invite your team",
    subtitle: "Add campaign managers, canvassers, and volunteers.",
    icon: Users,
    optional: true,
  },
  {
    id: "stripe",
    title: "Accept donations",
    subtitle: "Connect your bank account to receive online donations directly.",
    icon: CreditCard,
    optional: true,
  },
  {
    id: "launch",
    title: "You're ready",
    subtitle: "Review your setup and go to your campaign dashboard.",
    icon: Rocket,
    optional: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ELECTION_TYPE_LABELS: Record<string, string> = {
  municipal: "Municipal",
  provincial: "Provincial",
  federal: "Federal",
  by_election: "By-Election",
  nomination: "Nomination Race",
  leadership: "Leadership Race",
  other: "",
};

function electionLabel(type: string): string {
  return ELECTION_TYPE_LABELS[type] ?? type;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepPip({
  step,
  current,
  done,
}: {
  step: Step;
  current: StepId;
  done: boolean;
}) {
  const isActive = step.id === current;
  const Icon = step.icon;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          done
            ? "bg-[#1D9E75] text-white"
            : isActive
            ? "bg-[#0A2342] text-white"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </div>
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  campaignId,
  campaignName,
  candidateName,
  electionType,
  jurisdiction,
  contactCount: initialContactCount,
  memberCount: initialMemberCount,
  stripeOnboarded: initialStripeOnboarded,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepId>("contacts");
  const [contactCount, setContactCount] = useState(initialContactCount);
  const [memberCount] = useState(initialMemberCount);
  const [stripeOnboarded] = useState(initialStripeOnboarded);
  const [completing, setCompleting] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const stepsDone: Record<StepId, boolean> = {
    contacts: contactCount > 0,
    team: memberCount > 1,
    stripe: stripeOnboarded,
    launch: false,
  };

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  function advance() {
    const next = STEPS[currentIndex + 1];
    if (next) setCurrentStep(next.id);
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
      setCompleting(false);
    }
  }

  async function handleStripeConnect() {
    setConnectingStripe(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/stripe/onboard`, {
        method: "POST",
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Could not start Stripe setup. Try from Fundraising → Settings later.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Could not connect to Stripe. Try again.");
    } finally {
      setConnectingStripe(false);
    }
  }

  // ── Upload handler (basic CSV — triggers import API) ──────────────────────
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaignId", campaignId);

    try {
      const res = await fetch("/api/import-export", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as { data?: { inserted?: number }; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Import failed — check your CSV format.");
        return;
      }
      const count = data.data?.inserted ?? 0;
      setContactCount((prev) => prev + count);
      toast.success(`${count} contacts imported successfully.`);
    } catch {
      toast.error("Upload failed. Try the full import tool.");
    } finally {
      e.target.value = "";
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#0A2342] text-white px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Poll City</h1>
              <p className="text-blue-200 text-sm mt-0.5">Campaign setup</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{campaignName}</p>
              {(candidateName || jurisdiction) && (
                <p className="text-blue-300 text-xs mt-0.5">
                  {[electionLabel(electionType), jurisdiction].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <StepPip
                  step={step}
                  current={currentStep}
                  done={stepsDone[step.id]}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      STEPS.findIndex((s) => s.id === currentStep) > i
                        ? "bg-[#1D9E75]"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500">
              Step {currentIndex + 1} of {STEPS.length}
              {STEPS[currentIndex]?.optional && (
                <span className="ml-1.5 text-slate-400">(optional)</span>
              )}
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {STEPS[currentIndex]?.title}
            </p>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">

        {/* ── Step: Contacts ── */}
        {currentStep === "contacts" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Import your contacts
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload a CSV of your supporters, voters, or existing contacts.
                Your canvassers will work from this list.
              </p>
            </div>

            {contactCount > 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {contactCount.toLocaleString()} contacts imported
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    You can add more anytime from the Contacts page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#0A2342] rounded-xl p-8 text-center cursor-pointer transition-colors group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#0A2342] mx-auto mb-3 transition-colors" />
                    <p className="text-sm font-medium text-slate-700 group-hover:text-[#0A2342]">
                      Drop a CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Columns: firstName, lastName, email, phone, address — all optional except at least one name field
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                  </div>
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <a
                  href="/import-export"
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Open full import tool <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <StepActions
              onSkip={advance}
              onContinue={advance}
              skipLabel="Skip for now"
              continueLabel={contactCount > 0 ? "Continue" : "Skip for now"}
              continueDisabled={false}
            />
          </div>
        )}

        {/* ── Step: Team ── */}
        {currentStep === "team" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Invite your team
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Add campaign managers, canvassers, and volunteers.
                You can manage roles and permissions from Settings at any time.
              </p>
            </div>

            {memberCount > 1 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {memberCount - 1} team member{memberCount > 2 ? "s" : ""} already invited
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Manage your team from Settings → Team.
                  </p>
                </div>
              </div>
            ) : (
              <a
                href="/settings/team"
                target="_blank"
                className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-[#0A2342] hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0A2342]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#0A2342]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0A2342]">
                      Open Team Settings
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Send email invites and assign roles
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#0A2342]" />
              </a>
            )}

            <StepActions
              onSkip={advance}
              onContinue={advance}
              skipLabel="Skip for now"
              continueLabel={memberCount > 1 ? "Continue" : "Skip for now"}
              continueDisabled={false}
            />
          </div>
        )}

        {/* ── Step: Stripe ── */}
        {currentStep === "stripe" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Accept online donations
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Connect your bank account through Stripe. Donations go directly to you —
                Poll City takes a 1.5% platform fee. Setup takes about 5 minutes.
              </p>
            </div>

            {stripeOnboarded ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Stripe account connected
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Your donation page is active and ready to share.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleStripeConnect}
                  disabled={connectingStripe}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0A2342] hover:bg-[#0d2d57] disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {connectingStripe ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Connect bank account</>
                  )}
                </button>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
                  <p className="font-medium text-slate-700">What you&apos;ll need:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Your banking information</li>
                    <li>Government-issued ID</li>
                    <li>Your campaign&apos;s registered address</li>
                  </ul>
                  <p className="pt-1">
                    Powered by Stripe Express — your data goes directly to Stripe, not Poll City.
                  </p>
                </div>
              </div>
            )}

            <StepActions
              onSkip={advance}
              onContinue={advance}
              skipLabel="Set up later"
              continueLabel={stripeOnboarded ? "Continue" : "Set up later"}
              continueDisabled={false}
            />
          </div>
        )}

        {/* ── Step: Launch ── */}
        {currentStep === "launch" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Your campaign is ready
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Here&apos;s where you stand. You can complete anything you skipped at any time.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              <LaunchItem
                label="Campaign created"
                description={campaignName}
                done
              />
              <LaunchItem
                label="Contacts imported"
                description={
                  contactCount > 0
                    ? `${contactCount.toLocaleString()} contacts ready`
                    : "No contacts yet — add them from Contacts"
                }
                done={contactCount > 0}
                actionHref="/import-export"
                actionLabel="Import now"
              />
              <LaunchItem
                label="Team invited"
                description={
                  memberCount > 1
                    ? `${memberCount - 1} team member${memberCount > 2 ? "s" : ""} added`
                    : "Just you — invite your team from Settings"
                }
                done={memberCount > 1}
                actionHref="/settings/team"
                actionLabel="Invite now"
              />
              <LaunchItem
                label="Donations enabled"
                description={
                  stripeOnboarded
                    ? "Stripe connected — your donation page is live"
                    : "Not connected — set up from Fundraising → Settings"
                }
                done={stripeOnboarded}
                actionHref="/fundraising?tab=settings"
                actionLabel="Connect now"
              />
            </div>

            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-[#1D9E75] hover:bg-[#17896a] disabled:bg-slate-300 text-white text-base font-semibold rounded-xl transition-colors"
            >
              {completing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your dashboard…</>
              ) : (
                <>Go to your dashboard <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared step action buttons ───────────────────────────────────────────────

function StepActions({
  onSkip,
  onContinue,
  skipLabel,
  continueLabel,
  continueDisabled,
}: {
  onSkip: () => void;
  onContinue: () => void;
  skipLabel: string;
  continueLabel: string;
  continueDisabled: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onSkip}
        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        {skipLabel}
      </button>
      <button
        onClick={onContinue}
        disabled={continueDisabled}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A2342] hover:bg-[#0d2d57] disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {continueLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Launch checklist item ────────────────────────────────────────────────────

function LaunchItem({
  label,
  description,
  done,
  actionHref,
  actionLabel,
}: {
  label: string;
  description: string;
  done: boolean;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
      </div>
      {!done && actionHref && actionLabel && (
        <a
          href={actionHref}
          className="shrink-0 text-xs font-semibold text-[#1D9E75] hover:underline"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
