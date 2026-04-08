"use client";

import { useState } from "react";
import { LayoutDashboard, Users, Globe, CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { PageHeader, Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface CampaignRow {
  id: string;
  name: string;
  electionType: string;
  electionDate: string | null;
  contactCount: number;
  teamSize: number;
  isActive: boolean;
}

interface Props {
  totalCampaigns: number;
  totalContacts: number;
  totalUsers: number;
  activeCampaigns: number;
  campaigns: CampaignRow[];
}

function formatElectionDate(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function CampaignsOpsClient({
  totalCampaigns,
  totalContacts,
  totalUsers,
  activeCampaigns,
  campaigns,
}: Props) {
  const [enteringId, setEnteringId] = useState<string | null>(null);

  async function handleEnter(campaignId: string) {
    setEnteringId(campaignId);
    try {
      const res = await fetch("/api/campaigns/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to switch campaign");
        setEnteringId(null);
        return;
      }
      // Full reload so the session picks up the new activeCampaignId
      window.location.href = "/dashboard";
    } catch {
      alert("Network error. Please try again.");
      setEnteringId(null);
    }
  }

  const summaryStats = [
    { label: "Total Campaigns", value: totalCampaigns, icon: LayoutDashboard, color: NAVY },
    { label: "Total Contacts", value: totalContacts.toLocaleString(), icon: Users, color: GREEN },
    { label: "Team Members", value: totalUsers, icon: Users, color: "#6366f1" },
    { label: "Active Campaigns", value: activeCampaigns, icon: CalendarDays, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Campaigns"
        description="Global view of every client campaign on the platform."
        actions={
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ background: NAVY }}
          >
            {totalCampaigns} campaign{totalCampaigns !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}1a` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Campaign table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Election Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Contacts
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    No campaigns found.
                  </td>
                </tr>
              )}
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    "transition-colors hover:bg-gray-50",
                    enteringId === c.id && "opacity-60"
                  )}
                >
                  {/* Campaign name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                        style={{ background: NAVY }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">
                        {c.name}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {capitalize(c.electionType)}
                    </span>
                  </td>

                  {/* Election date */}
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {formatElectionDate(c.electionDate)}
                    </span>
                  </td>

                  {/* Contacts */}
                  <td className="px-4 py-3 hidden sm:table-cell text-right text-gray-700 font-medium">
                    {c.contactCount.toLocaleString()}
                  </td>

                  {/* Team */}
                  <td className="px-4 py-3 hidden md:table-cell text-right text-gray-700 font-medium">
                    {c.teamSize}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${GREEN}1a`, color: GREEN }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Past
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleEnter(c.id)}
                      disabled={enteringId !== null}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      style={{ background: NAVY }}
                    >
                      {enteringId === c.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Entering...
                        </>
                      ) : (
                        <>
                          Enter
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
