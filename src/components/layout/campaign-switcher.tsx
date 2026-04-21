"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignOption {
  campaignId: string;
  campaignName: string;
  electionType: string;
  role: string;
  isActive: boolean;
}

export default function CampaignSwitcher() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { update } = useSession();

  useEffect(() => {
    fetch("/api/campaigns/switch")
      .then(r => r.json())
      .then(d => setCampaigns(d.data ?? []));
  }, []);

  // Only render if user has more than one campaign
  if (campaigns.length <= 1) return null;

  const active = campaigns.find(c => c.isActive) ?? campaigns[0];

  async function switchTo(campaignId: string) {
    if (switching || campaignId === active?.campaignId) { setOpen(false); return; }
    setSwitching(true);
    try {
      const res = await fetch("/api/campaigns/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) return;
      // Update the JWT so the server sees the new activeCampaignId immediately
      await update({ activeCampaignId: campaignId });
      setOpen(false);
      // Hard navigate so all server components re-fetch with the new campaign
      window.location.href = "/dashboard";
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 transition-colors text-white text-sm font-medium"
      >
        <Building2 className="w-3.5 h-3.5 opacity-80" />
        <span className="max-w-[140px] truncate">{active?.campaignName ?? "Select Campaign"}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Campaigns</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {campaigns.map(c => (
                <button
                  key={c.campaignId}
                  onClick={() => switchTo(c.campaignId)}
                  disabled={switching}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50",
                    c.isActive && "bg-blue-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", c.isActive ? "text-blue-700" : "text-gray-900")}>
                      {c.campaignName}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{c.electionType?.replace(/_/g, " ")} · {c.role.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                  {c.isActive && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
