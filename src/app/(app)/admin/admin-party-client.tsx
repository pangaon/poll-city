"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users, ShieldAlert, Settings, PlusCircle, FileSearch,
  Vote, Landmark, MapPin, Play, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, Badge } from "@/components/ui";

/* ── colour tokens ── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ── types ── */
type NominationStatus = "declared" | "campaigning" | "voting" | "elected";

interface NominationRace {
  id: string;
  name: string;
  riding: string;
  status: NominationStatus;
  nominees: number;
  deadline: string;
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  forVotes: number;
  againstVotes: number;
  closed: boolean;
}

type RidingHealth = "on-track" | "needs-attention" | "critical";

interface RidingCard {
  id: string;
  name: string;
  health: RidingHealth;
  volunteers: number;
  doors: number;
  raised: number;
}

/* ── seed data ── */
const SEED_NOMINATIONS: NominationRace[] = [
  { id: "n1", name: "Ward 11 Nomination", riding: "University-Rosedale", status: "campaigning", nominees: 4, deadline: "2026-05-15" },
  { id: "n2", name: "Ward 18 Nomination", riding: "Willowdale", status: "declared", nominees: 2, deadline: "2026-06-01" },
  { id: "n3", name: "Ward 4 Nomination", riding: "Parkdale-High Park", status: "voting", nominees: 3, deadline: "2026-04-20" },
  { id: "n4", name: "Ward 25 Nomination", riding: "Scarborough-Rouge Park", status: "elected", nominees: 1, deadline: "2026-03-01" },
];

const SEED_RESOLUTIONS: Resolution[] = [
  { id: "r1", title: "Adopt ranked-ballot nominations", description: "Switch from FPTP to ranked ballot for all future nomination contests.", forVotes: 127, againstVotes: 43, closed: false },
  { id: "r2", title: "Increase membership fee to $25", description: "Raise annual membership from $10 to $25 to fund riding associations.", forVotes: 89, againstVotes: 112, closed: true },
  { id: "r3", title: "Create youth council advisory body", description: "Establish a permanent youth council with advisory powers to the executive.", forVotes: 201, againstVotes: 18, closed: false },
];

const SEED_RIDINGS: RidingCard[] = [
  { id: "rd1", name: "University-Rosedale", health: "on-track", volunteers: 42, doors: 3200, raised: 18500 },
  { id: "rd2", name: "Spadina-Fort York", health: "on-track", volunteers: 38, doors: 2800, raised: 15200 },
  { id: "rd3", name: "Willowdale", health: "needs-attention", volunteers: 12, doors: 800, raised: 4300 },
  { id: "rd4", name: "Parkdale-High Park", health: "on-track", volunteers: 31, doors: 2100, raised: 12800 },
  { id: "rd5", name: "Scarborough-Rouge Park", health: "critical", volunteers: 5, doors: 210, raised: 1100 },
  { id: "rd6", name: "Etobicoke-Lakeshore", health: "needs-attention", volunteers: 14, doors: 900, raised: 5600 },
  { id: "rd7", name: "Don Valley West", health: "on-track", volunteers: 27, doors: 1950, raised: 11300 },
  { id: "rd8", name: "Beaches-East York", health: "critical", volunteers: 3, doors: 120, raised: 600 },
  { id: "rd9", name: "Davenport", health: "on-track", volunteers: 35, doors: 2400, raised: 14000 },
];

/* ── helpers ── */
const STATUS_BADGE: Record<NominationStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  declared: { label: "Declared", variant: "info" },
  campaigning: { label: "Campaigning", variant: "warning" },
  voting: { label: "Voting", variant: "danger" },
  elected: { label: "Elected", variant: "success" },
};

const HEALTH_STYLES: Record<RidingHealth, { bg: string; border: string; dot: string; label: string }> = {
  "on-track": { bg: "bg-emerald-50", border: "border-emerald-200", dot: GREEN, label: "On Track" },
  "needs-attention": { bg: "bg-amber-50", border: "border-amber-200", dot: AMBER, label: "Needs Attention" },
  critical: { bg: "bg-red-50", border: "border-red-200", dot: RED, label: "Critical" },
};

function pct(a: number, b: number) {
  const total = a + b;
  return total === 0 ? 0 : Math.round((a / total) * 100);
}

/* ── shimmer skeleton ── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className ?? "h-4 w-full"}`} />
  );
}

/* ── component ── */
type AdminTab = "overview" | "party";

interface Props {
  campaignId: string;
  contactCount: number;
  volunteerCount: number;
  signCount: number;
  donationCount: number;
  taskCount: number;
}

export default function AdminPartyClient({
  campaignId,
  contactCount,
  volunteerCount,
  signCount,
  donationCount,
  taskCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [nominations, setNominations] = useState(SEED_NOMINATIONS);
  const [resolutions, setResolutions] = useState(SEED_RESOLUTIONS);
  const [ridings] = useState(SEED_RIDINGS);
  const [expandedRiding, setExpandedRiding] = useState<string | null>(null);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <Settings className="w-4 h-4" /> },
      { id: "party", label: "Party", icon: <Landmark className="w-4 h-4" /> },
    ],
    [],
  );

  function startVoting(raceId: string) {
    setNominations((prev) =>
      prev.map((n) => (n.id === raceId && n.status === "campaigning" ? { ...n, status: "voting" as NominationStatus } : n)),
    );
  }

  function voteResolution(resId: string, side: "for" | "against") {
    setResolutions((prev) =>
      prev.map((r) => {
        if (r.id !== resId || r.closed) return r;
        return side === "for" ? { ...r, forVotes: r.forVotes + 1 } : { ...r, againstVotes: r.againstVotes + 1 };
      }),
    );
  }

  const ridingsByHealth = useMemo(() => {
    const counts = { "on-track": 0, "needs-attention": 0, critical: 0 };
    ridings.forEach((r) => counts[r.health]++);
    return counts;
  }, [ridings]);

  return (
    <>
      {/* Tab bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? "text-white shadow-md"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              style={activeTab === tab.id ? { backgroundColor: NAVY } : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Contacts", value: contactCount, icon: Users },
              { label: "Volunteers", value: volunteerCount, icon: ShieldAlert },
              { label: "Signs", value: signCount, icon: FileSearch },
              { label: "Donations", value: donationCount, icon: PlusCircle },
              { label: "Tasks", value: taskCount, icon: Settings },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{metric.value}</p>
                  </div>
                  <metric.icon className="w-8 h-8 text-blue-600" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-gray-900">Administrative actions</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href="/settings" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700 min-h-[44px]">Campaign settings</Link>
              <Link href="/settings/fields" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700 min-h-[44px]">Custom field configuration</Link>
              <Link href="/campaigns" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700 min-h-[44px]">Campaign operations</Link>
              <Link href="/import-export" className="block rounded-xl border border-gray-200 px-4 py-4 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-700 min-h-[44px]">Import / export</Link>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Party tab ── */}
      {activeTab === "party" && (
        <div className="space-y-8">
          {/* Nomination Races */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Vote className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Nomination Races</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {nominations.map((race) => {
                const badge = STATUS_BADGE[race.status];
                return (
                  <Card key={race.id} className="overflow-hidden transition-transform hover:scale-[1.01]">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{race.name}</p>
                          <p className="text-sm text-gray-500">{race.riding}</p>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{race.nominees} nominee{race.nominees !== 1 ? "s" : ""}</span>
                        <span className="text-gray-400">Deadline: {race.deadline}</span>
                      </div>
                      {race.status === "campaigning" && (
                        <button
                          onClick={() => startVoting(race.id)}
                          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors min-h-[44px] w-full justify-center"
                          style={{ backgroundColor: GREEN }}
                        >
                          <Play className="w-4 h-4" />
                          Start Vote
                        </button>
                      )}
                      {race.status === "voting" && (
                        <div className="rounded-lg px-3 py-2 text-sm font-medium text-white text-center" style={{ backgroundColor: RED }}>
                          Voting in progress
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* AGM Resolutions */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>AGM Resolutions</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {resolutions.map((res) => {
                const forPct = pct(res.forVotes, res.againstVotes);
                const againstPct = 100 - forPct;
                const total = res.forVotes + res.againstVotes;
                return (
                  <Card key={res.id} className="overflow-hidden transition-transform hover:scale-[1.01]">
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{res.title}</p>
                          {res.closed && <Badge variant="default">Closed</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{res.description}</p>
                      </div>

                      {/* Results bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span style={{ color: GREEN }}>For {forPct}%</span>
                          <span style={{ color: RED }}>Against {againstPct}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                          <div className="h-full rounded-l-full transition-all" style={{ width: `${forPct}%`, backgroundColor: GREEN }} />
                          <div className="h-full rounded-r-full transition-all" style={{ width: `${againstPct}%`, backgroundColor: RED }} />
                        </div>
                        <p className="text-xs text-gray-400 text-center">{total} vote{total !== 1 ? "s" : ""} cast</p>
                      </div>

                      {/* Vote buttons */}
                      {!res.closed && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => voteResolution(res.id, "for")}
                            className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors min-h-[44px]"
                            style={{ backgroundColor: GREEN }}
                          >
                            For
                          </button>
                          <button
                            onClick={() => voteResolution(res.id, "against")}
                            className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors min-h-[44px]"
                            style={{ backgroundColor: RED }}
                          >
                            Against
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Multi-Riding Grid */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5" style={{ color: NAVY }} />
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Multi-Riding Overview</h2>
              <div className="flex gap-3 ml-auto text-xs font-medium">
                {(["on-track", "needs-attention", "critical"] as RidingHealth[]).map((h) => (
                  <span key={h} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: HEALTH_STYLES[h].dot }} />
                    {HEALTH_STYLES[h].label} ({ridingsByHealth[h]})
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ridings.map((riding) => {
                const style = HEALTH_STYLES[riding.health];
                const isExpanded = expandedRiding === riding.id;
                return (
                  <div
                    key={riding.id}
                    className={`rounded-xl border ${style.border} ${style.bg} p-4 transition-all hover:shadow-md cursor-pointer`}
                    onClick={() => setExpandedRiding(isExpanded ? null : riding.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{riding.name}</p>
                        <p className="text-xs font-medium mt-1" style={{ color: style.dot }}>{style.label}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{riding.volunteers}</p>
                        <p className="text-xs text-gray-500">Vols</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{riding.doors.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Doors</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">${(riding.raised / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-gray-500">Raised</p>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t text-sm text-gray-600 space-y-1" style={{ borderColor: style.dot + "40" }}>
                        <p>Doors/Vol: {riding.volunteers > 0 ? Math.round(riding.doors / riding.volunteers) : 0}</p>
                        <p>$/Vol: ${riding.volunteers > 0 ? Math.round(riding.raised / riding.volunteers) : 0}</p>
                        <p>Target coverage: {Math.min(100, Math.round((riding.doors / 5000) * 100))}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
