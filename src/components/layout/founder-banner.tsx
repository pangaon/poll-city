"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Crown, ArrowLeft } from "lucide-react";

export function FounderBanner({ campaignName }: { campaignName: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [exiting, setExiting] = useState(false);

  async function exitToOps() {
    setExiting(true);
    await fetch("/api/campaigns/switch/clear", { method: "POST" });
    await update({ activeCampaignId: null });
    router.push("/ops");
    router.refresh();
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-xs font-medium text-white"
      style={{ background: "#0A2342" }}
    >
      <div className="flex items-center gap-2">
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        <span>Viewing as client: <strong>{campaignName}</strong></span>
      </div>
      <button
        onClick={() => void exitToOps()}
        disabled={exiting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-3 h-3" />
        {exiting ? "Exiting…" : "Exit to Founder View"}
      </button>
    </div>
  );
}
