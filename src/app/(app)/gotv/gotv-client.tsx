"use client";
import { useEffect, useState } from "react";
import { Target, Upload, Radio, ListOrdered, Phone, MapPin, Check, Clock, Bell, AlertTriangle, Megaphone } from "lucide-react";
import { tierColor } from "@/lib/gotv/score";
import { WIN_THRESHOLD_RATIO } from "@/lib/gotv/constants";
import dynamic from "next/dynamic";
import {
  AnimatedCounter,
  Button,
  EmptyState,
  GapWidget,
  RacingLeaderboard,
  Skeleton,
} from "@/components/poll-city-components";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

interface Props {
  campaignId: string;
}

type Tab = "priority" | "strike" | "upload" | "command" | "alerts";

interface TieredContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address1: string | null;
  ward: string | null;
  supportLevel: string;
  gotvStatus: string | null;
  voted: boolean;
  gotvScore: number;
  tier: 1 | 2 | 3 | 4;
}

interface TiersResponse {
  summary: {
    totals: { t1: number; t2: number; t3: number; t4: number; all: number };
    voted: { t1: number; t2: number; t3: number; t4: number; all: number };
  };
  contacts: TieredContact[];
  totalInTier: number;
}

interface CommandResponse {
  summary: {
    totalVoters: number;
    totalVoted: number;
    votedPct: number;
    p1Total: number;
    p1Voted: number;
    p1VotedPct: number;
    outstandingP1: number;
    projectedTotal: number;
    hoursToClose: number;
  };
  hourlyVotes: Array<{ hour: string; voted: number }>;
  recentInteractions: number;
  electionDayReady: boolean;
}

interface GapResponse {
  gap: number;
  winThreshold: number;
  supportersVoted: number;
  totalSupporters: number;
  supportersRemaining: number;
  turnoutPct: number;
  supporterTurnoutPct: number;
  pacing: {
    hoursRemaining: number;
    votesNeededPerHour: number;
    onTrack: boolean;
  };
}

type RacePrecinct = {
  id: string;
  name: string;
  gap: number;
  turnout: number;
  totalVoters: number;
  volunteersAssigned: string[];
  targetVotes: number;
};

type VolunteerOption = { id: string; name: string; initials: string };

export default function GotvClient({ campaignId }: Props) {
  const [active, setActive] = useState<Tab>("priority");
  const [gapData, setGapData] = useState<GapResponse | null>(null);
  const [scope, setScope] = useState<"single" | "regional" | "national">("single");
  const [density, setDensity] = useState<"auto" | "compact" | "comfortable">("auto");
  const [viewport, setViewport] = useState({ width: 1366, height: 900 });
  const [racePrecincts, setRacePrecincts] = useState<RacePrecinct[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([]);
  const [raceLoading, setRaceLoading] = useState(true);

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadGap() {
      try {
        const res = await fetch(`/api/gotv/gap?campaignId=${campaignId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as GapResponse;
        if (mounted) setGapData(data);
      } catch {
        // Keep existing value and avoid noisy UI if connectivity blips.
      }
    }

    void loadGap();
    const id = window.setInterval(loadGap, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [campaignId]);

  useEffect(() => {
    let mounted = true;

    async function loadRace() {
      try {
        const [tiersRes, volunteerRes] = await Promise.all([
          fetch(`/api/gotv/tiers?campaignId=${campaignId}`, { cache: "no-store" }),
          fetch(`/api/volunteers/performance?campaignId=${campaignId}`, { cache: "no-store" }),
        ]);

        const tiersData = tiersRes.ok ? await tiersRes.json() as TiersResponse : null;
        const volunteerData = volunteerRes.ok ? await volunteerRes.json() : null;

        const grouped = new Map<string, { total: number; voted: number; supporters: number; name: string }>();
        for (const contact of tiersData?.contacts ?? []) {
          const key = contact.ward || "Unassigned";
          const current = grouped.get(key) ?? { total: 0, voted: 0, supporters: 0, name: key };
          current.total += 1;
          if (contact.voted) current.voted += 1;
          if (contact.supportLevel === "strong_support" || contact.supportLevel === "leaning_support") current.supporters += 1;
          grouped.set(key, current);
        }

        const nextPrecincts = Array.from(grouped.entries()).slice(0, 12).map(([ward, stats]) => {
          const targetVotes = Math.max(1, Math.ceil(stats.total * WIN_THRESHOLD_RATIO));
          const gap = Math.max(0, targetVotes - stats.voted);
          return {
            id: ward,
            name: ward,
            gap,
            turnout: stats.voted,
            totalVoters: stats.total,
            volunteersAssigned: [],
            targetVotes,
          };
        });

        const nextVolunteers: VolunteerOption[] = (volunteerData?.leaderboard ?? []).slice(0, 12).map((row: { userId: string; name: string }) => ({
          id: row.userId,
          name: row.name,
          initials: row.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        }));

        if (!mounted) return;
        setRacePrecincts(nextPrecincts);
        setVolunteers(nextVolunteers);
      } finally {
        if (mounted) setRaceLoading(false);
      }
    }

    loadRace();
    const id = window.setInterval(loadRace, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [campaignId]);

  useEffect(() => {
    if (density !== "auto") return;
    if (viewport.width >= 1700 && viewport.height >= 920) {
      setScope("national");
      return;
    }
    if (viewport.width >= 1280 && viewport.height >= 760) {
      setScope("regional");
      return;
    }
    setScope("single");
  }, [density, viewport.height, viewport.width]);

  const resolvedDensity = density === "auto"
    ? (viewport.height < 760 || viewport.width < 1100 ? "compact" : "comfortable")
    : density;

  const mapHeight = resolvedDensity === "compact"
    ? Math.max(250, Math.min(340, Math.floor(viewport.height * 0.34)))
    : Math.max(320, Math.min(480, Math.floor(viewport.height * 0.42)));

  const shellWidthClass = scope === "national"
    ? "max-w-[min(98vw,1880px)]"
    : scope === "regional"
      ? "max-w-[min(96vw,1600px)]"
      : "max-w-6xl";

  const shellSpacingClass = resolvedDensity === "compact" ? "py-4 md:py-6 space-y-4" : "py-6 md:py-10 space-y-5";

  return (
    <div className={`${shellWidthClass} mx-auto px-4 ${shellSpacingClass} pb-[env(safe-area-inset-bottom)]`}>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Get Out The Vote</h1>
        </div>
      </header>

      <section className="mb-6" aria-label="The Gap">
        {gapData ? (
          <GapWidget
            gap={gapData.gap}
            voted={gapData.supportersVoted}
            threshold={gapData.winThreshold}
            pace={gapData.pacing.votesNeededPerHour}
            currentPace={Math.max(1, Math.round(gapData.supportersVoted / Math.max(1, 12 - gapData.pacing.hoursRemaining)))}
            onMarkVoted={async () => {
              await fetch(`/api/gotv/mark-voted`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId }),
              }).catch(() => undefined);
            }}
            onStrikeOff={async (name) => {
              await fetch(`/api/gotv/strike-off`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId, name }),
              }).catch(() => undefined);
            }}
          />
        ) : (
          <Skeleton height={220} radius={16} />
        )}
      </section>


      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Supporter density map</p>
        <CampaignMap mode="gotv" height={mapHeight} showControls />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Race Leaderboard</p>
          {gapData && <span className="text-xs text-slate-600">Gap <AnimatedCounter value={gapData.gap} /></span>}
        </div>
        {raceLoading ? (
          <Skeleton height={280} radius={12} />
        ) : racePrecincts.length === 0 ? (
          <EmptyState
            icon="🏁"
            title="No precinct race data yet"
            description="Sync contact wards and turnout records to start live precinct ranking."
            actionLabel="Open Priority List"
            onAction={() => setActive("priority")}
          />
        ) : (
          <RacingLeaderboard
            precincts={racePrecincts}
            availableVolunteers={volunteers}
            onDispatch={async (precinctId, volunteerId) => {
              await fetch(`/api/gotv/rides`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId, precinctId, volunteerId }),
              }).catch(() => undefined);
            }}
          />
        )}
      </section>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-4">
        {(
          [
            { id: "priority", label: "Priority List", icon: ListOrdered },
            { id: "strike", label: "Strike Off", icon: Check },
            { id: "upload", label: "Upload Voted", icon: Upload },
            { id: "command", label: "Election Day", icon: Radio },
            { id: "alerts", label: "Rapid Alerts", icon: Bell },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <Button
              key={t.id}
              onClick={() => setActive(t.id)}
              variant={isActive ? "primary" : "secondary"}
              size="sm"
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {active === "priority" && <PriorityListTab campaignId={campaignId} />}
      {active === "strike" && <StrikeTab campaignId={campaignId} />}
      {active === "upload" && <UploadTab campaignId={campaignId} />}
      {active === "command" && <CommandTab campaignId={campaignId} />}
      {active === "alerts" && <AlertsTab campaignId={campaignId} gapData={gapData} />}
    </div>
  );
}

function PriorityListTab({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<TiersResponse | null>(null);
  const [tier, setTier] = useState<1 | 2 | 3 | 4 | null>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = `/api/gotv/tiers?campaignId=${campaignId}${tier ? `&tier=${tier}` : ""}`;
    fetch(url).then((r) => r.json()).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [campaignId, tier]);

  if (loading && !data) {
    return <Skeleton height={140} radius={12} />;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Tier summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((t) => {
          const total = data.summary.totals[`t${t}` as "t1"];
          const voted = data.summary.voted[`t${t}` as "t1"];
          return (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`text-left rounded-xl border p-3 md:p-4 transition-colors ${
                tier === t ? "border-red-500 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: tierColor(t) }} />
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Priority {t}</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{total.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{voted.toLocaleString()} voted</p>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <p className="font-bold text-slate-900">
            {data.contacts.length} of {data.totalInTier.toLocaleString()} shown
          </p>
          {tier && (
            <button onClick={() => setTier(null)} className="text-xs font-semibold text-blue-700 hover:underline">
              Show all tiers
            </button>
          )}
        </div>
        <ul className="divide-y divide-slate-100">
          {data.contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 p-3 md:p-4 hover:bg-slate-50"
              draggable
              onDragStart={(event) => {
                const payload = JSON.stringify({
                  type: "gotv-priority",
                  id: c.id,
                  name: `${c.firstName} ${c.lastName}`,
                  tier: c.tier,
                  voted: c.voted,
                  score: c.gotvScore,
                });
                event.dataTransfer.setData("application/json", payload);
                event.dataTransfer.setData("text/plain", `GOTV contact ${c.firstName} ${c.lastName} P${c.tier}`);
              }}
            >
              <div className="w-1 h-10 rounded-full" style={{ background: tierColor(c.tier) }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.address1 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address1}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-slate-900 tabular-nums">{c.gotvScore}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">{c.voted ? "Voted ✓" : `P${c.tier}`}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StrikeTab({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<TiersResponse | null>(null);

  useEffect(() => {
    fetch(`/api/gotv/tiers?campaignId=${campaignId}`).then((r) => r.json()).then(setData);
  }, [campaignId]);

  if (!data) return <Skeleton height={110} radius={12} />;

  const votedPct = data.summary.totals.all > 0
    ? Math.round((data.summary.voted.all / data.summary.totals.all) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Strike-Off Progress</h2>
            <span className="text-3xl font-extrabold text-emerald-600 tabular-nums"><AnimatedCounter value={votedPct} format={(n) => `${Math.round(n)}%`} /></span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${votedPct}%` }}
          />
        </div>
        <p className="text-sm text-slate-600 mt-2">
          {data.summary.voted.all.toLocaleString()} of {data.summary.totals.all.toLocaleString()} tagged voters have cast a ballot.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((t) => {
          const total = data.summary.totals[`t${t}` as "t1"];
          const voted = data.summary.voted[`t${t}` as "t1"];
          const pct = total ? Math.round((voted / total) * 100) : 0;
          return (
            <div key={t} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: tierColor(t) }} />
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">P{t}</p>
              </div>
              <p className="text-xl font-extrabold mt-1 tabular-nums">{voted.toLocaleString()}<span className="text-sm text-slate-400">/{total.toLocaleString()}</span></p>
              <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: tierColor(t) }} />
              </div>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">{pct}% voted</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UploadTab({ campaignId }: { campaignId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    matched?: number; unmatched?: number; newGap?: number;
    supportersVoted?: number; winThreshold?: number; totalRows?: number;
    error?: string;
  } | null>(null);

  async function submit() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      const res = await fetch("/api/gotv/upload-voted-list", { method: "POST", body: form });
      const data = await res.json();
      setResult(res.ok ? data : { error: data.error ?? "Upload failed" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <h2 className="font-bold text-slate-900 mb-2">Upload voted list</h2>
        <p className="text-sm text-slate-600 mb-4">
          Upload a CSV from the poll clerk (columns: firstName, lastName, address). We&apos;ll match against your contacts and mark them voted.
        </p>
        <label className="block">
          <input
            type="file"
            accept=".csv,.tsv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:h-11 file:px-4 file:rounded-lg file:border-0 file:bg-red-700 file:text-white file:font-semibold hover:file:bg-red-800 file:cursor-pointer"
          />
        </label>
        {file && (
          <p className="text-xs text-slate-500 mt-2">
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
        <button
          onClick={submit}
          disabled={!file || uploading}
          className="mt-4 w-full md:w-auto h-12 px-6 rounded-lg bg-red-700 text-white font-bold hover:bg-red-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? "Matching…" : "Process voted list"}
        </button>
      </div>

      {result && !result.error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <h3 className="font-bold text-emerald-900">Marked {result.matched?.toLocaleString() ?? 0} contacts voted</h3>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div><p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{result.matched ?? 0}</p><p className="text-xs text-slate-600">Matched</p></div>
            <div><p className="text-2xl font-extrabold text-slate-500 tabular-nums">{result.unmatched ?? 0}</p><p className="text-xs text-slate-600">Unmatched</p></div>
            <div><p className="text-2xl font-extrabold text-red-700 tabular-nums">{result.newGap ?? 0}</p><p className="text-xs text-slate-600">Gap remaining</p></div>
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">
            {result.supportersVoted?.toLocaleString() ?? 0} supporters voted · win threshold {result.winThreshold?.toLocaleString() ?? 0} · {result.totalRows?.toLocaleString() ?? 0} rows in file
          </p>
        </div>
      )}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">{result.error}</div>
      )}
    </div>
  );
}

function CommandTab({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<CommandResponse | null>(null);

  useEffect(() => {
    const load = () => fetch(`/api/gotv/command?campaignId=${campaignId}`).then((r) => r.json()).then(setData);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [campaignId]);

  if (!data) return <Skeleton height={180} radius={12} />;

  return (
    <div className="space-y-4">
      {/* Hero metrics */}
      <div
        className="rounded-2xl p-5 md:p-6 text-white"
        style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Election Day Command</p>
          <span className="text-xs text-blue-100 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live · refreshes every 60s
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-blue-100">Your voters voted</p>
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums">{data.summary.votedPct}%</p>
            <p className="text-xs text-blue-100 tabular-nums">{data.summary.totalVoted.toLocaleString()} of {data.summary.totalVoters.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-blue-100">P1 confirmed</p>
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums">{data.summary.p1VotedPct}%</p>
            <p className="text-xs text-blue-100 tabular-nums">{data.summary.p1Voted.toLocaleString()} of {data.summary.p1Total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-blue-100">Outstanding P1</p>
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums text-amber-300">{data.summary.outstandingP1.toLocaleString()}</p>
            <p className="text-xs text-blue-100">still need a call</p>
          </div>
          <div>
            <p className="text-xs text-blue-100">Projected total</p>
            <p className="text-3xl md:text-4xl font-extrabold tabular-nums text-emerald-300">{data.summary.projectedTotal.toLocaleString()}</p>
            <p className="text-xs text-blue-100 flex items-center gap-1"><Clock className="w-3 h-3" />{data.summary.hoursToClose}h to poll close</p>
          </div>
        </div>
      </div>

      {/* Voting pace */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Voting pace</p>
          <p className="text-sm text-slate-500">{data.recentInteractions.toLocaleString()} interactions in last 12h</p>
        </div>
      </div>

      {!data.electionDayReady && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <Target className="inline w-4 h-4 mr-1.5" />
          No Priority 1 contacts scored yet. Run canvassing and ID supporters first — their votes are what this dashboard tracks.
        </div>
      )}
    </div>
  );
}

type AlertTemplateKey =
  | "p1_rescue"
  | "low_poll_turnout"
  | "redeploy_team"
  | "all_hands"
  | "legal_incident";

function AlertsTab({ campaignId, gapData }: { campaignId: string; gapData: GapResponse | null }) {
  const [commandData, setCommandData] = useState<CommandResponse | null>(null);
  const [wardInput, setWardInput] = useState("");
  const [template, setTemplate] = useState<AlertTemplateKey>("p1_rescue");
  const [customMessage, setCustomMessage] = useState("");
  const [sendStaffAlert, setSendStaffAlert] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/gotv/command?campaignId=${campaignId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as CommandResponse;
        if (mounted) setCommandData(data);
      } catch {
        // Best effort telemetry for alerts tab.
      }
    }

    void load();
    const id = window.setInterval(load, 45_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [campaignId]);

  const warnings = [
    {
      id: "gap-critical",
      show: Boolean(gapData && gapData.gap > 0 && gapData.pacing.hoursRemaining <= 3),
      title: "Critical final-hours gap",
      detail: gapData
        ? `${gapData.gap.toLocaleString()} votes still needed with ${gapData.pacing.hoursRemaining}h remaining. Immediate P1 rescue required.`
        : "",
      severity: "critical",
      suggestedTemplate: "all_hands" as AlertTemplateKey,
    },
    {
      id: "p1-not-moving",
      show: Boolean(commandData && commandData.summary.p1VotedPct < 45 && commandData.summary.hoursToClose <= 5),
      title: "Priority 1 turnout lag",
      detail: commandData
        ? `Only ${commandData.summary.p1VotedPct}% of Priority 1 supporters have voted. ${commandData.summary.outstandingP1.toLocaleString()} still outstanding.`
        : "",
      severity: "high",
      suggestedTemplate: "p1_rescue" as AlertTemplateKey,
    },
    {
      id: "poll-under-10",
      show: Boolean(gapData && gapData.pacing.votesNeededPerHour >= 10),
      title: "Low pull pace detected",
      detail: gapData
        ? `Required pace is ${gapData.pacing.votesNeededPerHour.toLocaleString()} votes/hour. Trigger poll-level support redeployment now.`
        : "",
      severity: "high",
      suggestedTemplate: "low_poll_turnout" as AlertTemplateKey,
    },
  ].filter((w) => w.show);

  function renderTemplate(kind: AlertTemplateKey) {
    const zone = wardInput.trim() || "priority zone";
    const outstanding = commandData?.summary.outstandingP1 ?? 0;
    const gap = gapData?.gap ?? 0;
    const pace = gapData?.pacing.votesNeededPerHour ?? 0;

    switch (kind) {
      case "p1_rescue":
        return `P1 RESCUE: ${outstanding.toLocaleString()} top supporters still need to vote. Field + phone bank: contact list now. Zone: ${zone}.`;
      case "low_poll_turnout":
        return `POLL ALERT: Pull count in ${zone} is below threshold. If your poll is under 10 pulls this hour, switch to direct turnout chase immediately.`;
      case "redeploy_team":
        return `REDEPLOY NOW: Move available crews to ${zone}. We need +${gap.toLocaleString()} additional votes. Target pace: ${pace.toLocaleString()}/hour.`;
      case "all_hands":
        return `ALL HANDS DITCH SAVE: We need ${gap.toLocaleString()} more votes to hit threshold. Pause non-critical tasks and execute GOTV rescue in ${zone}.`;
      case "legal_incident":
        return `LEGAL ESCALATION: Issue reported at ${zone}. Send legal response contact and log incident details immediately.`;
      default:
        return "";
    }
  }

  const message = customMessage.trim() || renderTemplate(template);

  async function dispatchAlerts() {
    if (!message.trim()) return;
    setSending(true);
    setLastResult(null);

    const channels: string[] = [];
    let sentCount = 0;

    try {
      if (sendStaffAlert) {
        const staffRes = await fetch("/api/notifications/staff-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            event: `gotv_${template}`,
            message,
          }),
        });
        if (staffRes.ok) {
          channels.push("staff");
          const payload = await staffRes.json().catch(() => null);
          sentCount += Number(payload?.data?.notified ?? 0);
        }
      }

      if (sendPush) {
        const pushRes = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            title: "GOTV War Room Alert",
            body: message,
            filters: wardInput.trim() ? { ward: wardInput.trim() } : undefined,
          }),
        });
        if (pushRes.ok) {
          channels.push("push");
          const payload = await pushRes.json().catch(() => null);
          sentCount += Number(payload?.data?.sent ?? 0);
        }
      }

      if (sendSms) {
        const smsRes = await fetch("/api/communications/sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            body: message,
            supportLevels: ["strong_support", "leaning_support"],
            wards: wardInput.trim() ? [wardInput.trim()] : undefined,
            excludeDnc: true,
            testOnly: false,
          }),
        });
        if (smsRes.ok) {
          channels.push("sms");
          const payload = await smsRes.json().catch(() => null);
          sentCount += Number(payload?.sent ?? 0);
        }
      }

      setLastResult(
        channels.length
          ? `Sent via ${channels.join(", ")} to ${sentCount.toLocaleString()} recipients/log entries.`
          : "No channel succeeded. Check permissions or channel configuration.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Megaphone className="w-5 h-5 text-red-700" />Rapid Election Alerts</h2>
            <p className="text-sm text-slate-600 mt-1">Edge-case detection plus one-click dispatch for field teams, managers, and last-minute ditch saves.</p>
          </div>
          <span className="text-xs rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-semibold">War Room</span>
        </div>

        <div className="mt-4 space-y-2">
          {warnings.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">No critical warnings right now. Keep monitoring gap and hourly pace.</div>
          ) : (
            warnings.map((w) => (
              <button
                key={w.id}
                onClick={() => setTemplate(w.suggestedTemplate)}
                className="w-full text-left rounded-xl border border-amber-300 bg-amber-50 p-3 hover:bg-amber-100"
              >
                <p className="font-semibold text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{w.title}</p>
                <p className="text-sm text-amber-800 mt-0.5">{w.detail}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <p className="text-sm font-semibold text-slate-900 mb-2">Alert Template</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            ["p1_rescue", "P1 Rescue"],
            ["low_poll_turnout", "Low Poll Pull"],
            ["redeploy_team", "Redeploy Team"],
            ["all_hands", "All Hands"],
            ["legal_incident", "Legal Incident"],
          ] as Array<[AlertTemplateKey, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTemplate(key)}
              className={`h-9 px-3 rounded-full text-xs font-semibold border ${template === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Message</label>
            <textarea
              rows={4}
              value={customMessage || renderTemplate(template)}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Target area or ward</label>
            <input
              value={wardInput}
              onChange={(e) => setWardInput(e.target.value)}
              placeholder="Ward 5, Poll 112"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={sendStaffAlert} onChange={(e) => setSendStaffAlert(e.target.checked)} />Staff alert</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} />Push notification</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />SMS blast (supporters)</label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Use this for scenarios like poll under 10 pulls, urgent redeploy, ditch save, or legal escalation at a poll.</p>
          <button
            onClick={dispatchAlerts}
            disabled={sending || !message.trim()}
            className="h-11 px-5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Alert"}
          </button>
        </div>

        {lastResult && <p className="mt-3 text-sm text-slate-700 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">{lastResult}</p>}
      </div>
    </div>
  );
}
