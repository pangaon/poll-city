"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

const SetupWizard = dynamic(() => import("./setup-wizard"), { ssr: false });

const SNOOZE_KEY = "pollcity_setup_snoozed";

interface SetupStatus {
  onboardingComplete: boolean;
  candidateName: string | null;
  candidateTitle: string | null;
  jurisdiction: string | null;
  electionType: string | null;
  electionDate: string | null;
  advanceVoteStart: string | null;
  advanceVoteEnd: string | null;
  officeAddress: string | null;
  candidatePhone: string | null;
  candidateEmail: string | null;
  websiteUrl: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  facebookUrl: string | null;
  fromEmailName: string | null;
  replyToEmail: string | null;
}

export default function SetupWizardGate() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isDemo = searchParams?.get("demo") === "true";

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const campaignId =
    (session?.user as { activeCampaignId?: string | null } | undefined)
      ?.activeCampaignId ?? null;

  useEffect(() => {
    if (!campaignId || isDemo) return;
    // Check if user snoozed this session
    const alreadySnoozed = sessionStorage.getItem(SNOOZE_KEY) === campaignId;
    fetch("/api/campaigns/setup", {
      headers: { "x-campaign-id": campaignId },
    })
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        setStatus(data);
        if (!data.onboardingComplete) {
          if (alreadySnoozed) {
            setSnoozed(true);
          } else {
            setShowWizard(true);
          }
        }
      })
      .catch(() => {
        // silent — if this fails, skip the wizard rather than blocking the app
      });
  }, [campaignId, isDemo]);

  function handleSnooze() {
    if (campaignId) sessionStorage.setItem(SNOOZE_KEY, campaignId);
    setShowWizard(false);
    setSnoozed(true);
  }

  function reopenWizard() {
    setSnoozed(false);
    setBannerDismissed(false);
    setShowWizard(true);
  }

  const userName = (session?.user as { name?: string | null } | undefined)?.name ?? "";
  const firstName = userName.split(" ")[0] || "there";

  const initial = status ? {
    candidateName: status.candidateName ?? undefined,
    candidateTitle: status.candidateTitle ?? undefined,
    jurisdiction: status.jurisdiction ?? undefined,
    electionType: status.electionType ?? undefined,
    electionDate: status.electionDate ?? undefined,
    advanceVoteStart: status.advanceVoteStart ?? undefined,
    advanceVoteEnd: status.advanceVoteEnd ?? undefined,
    officeAddress: status.officeAddress ?? undefined,
    candidatePhone: status.candidatePhone ?? undefined,
    candidateEmail: status.candidateEmail ?? undefined,
    websiteUrl: status.websiteUrl ?? undefined,
    twitterHandle: status.twitterHandle ?? undefined,
    instagramHandle: status.instagramHandle ?? undefined,
    facebookUrl: status.facebookUrl ?? undefined,
    fromEmailName: status.fromEmailName ?? undefined,
    replyToEmail: status.replyToEmail ?? undefined,
  } : {};

  return (
    <>
      {/* Full wizard modal */}
      {showWizard && status && campaignId && (
        <SetupWizard
          campaignId={campaignId}
          firstName={firstName}
          initial={initial}
          onComplete={() => setShowWizard(false)}
          onSnooze={handleSnooze}
        />
      )}

      {/* Nudge banner — shown after snooze, until setup complete or banner dismissed */}
      {snoozed && !showWizard && !bannerDismissed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-sm">
          <span className="text-slate-300">Your campaign setup is incomplete.</span>
          <button
            onClick={reopenWizard}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: "#1D9E75" }}
          >
            Finish setup
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
