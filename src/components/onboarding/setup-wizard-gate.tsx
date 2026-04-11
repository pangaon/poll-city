"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const SetupWizard = dynamic(() => import("./setup-wizard"), { ssr: false });

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

  const campaignId =
    (session?.user as { activeCampaignId?: string | null } | undefined)
      ?.activeCampaignId ?? null;

  useEffect(() => {
    if (!campaignId || isDemo) return;
    fetch("/api/campaigns/setup", {
      headers: { "x-campaign-id": campaignId },
    })
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        setStatus(data);
        if (!data.onboardingComplete) {
          setShowWizard(true);
        }
      })
      .catch(() => {
        // silent — if this fails, skip the wizard rather than blocking the app
      });
  }, [campaignId, isDemo]);

  if (!showWizard || !status || !campaignId) return null;

  const userName = (session?.user as { name?: string | null } | undefined)?.name ?? "";
  const firstName = userName.split(" ")[0] || "there";

  return (
    <SetupWizard
      campaignId={campaignId}
      firstName={firstName}
      initial={{
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
      }}
      onComplete={() => setShowWizard(false)}
    />
  );
}
