"use client";
import { useEffect, useState } from "react";
import { Target, Upload, Radio, ListOrdered, Phone, MapPin, Check, Clock, Loader2 } from "lucide-react";
import { tierColor } from "@/lib/gotv/score";
import dynamic from "next/dynamic";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

interface Props {
  campaignId: string;
}

type Tab = "priority" | "strike" | "upload" | "command";

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

export default function GotvClient({ campaignId }: Props) {
  const [active, setActive] = useState<Tab>("priority");
  const [gapData, setGapData] = useState<GapResponse | null>(null);
  const [scope, setScope] = useState<"single" | "regional" | "national">("single");
  const [density, setDensity] = useState<"auto" | "compact" | "comfortable">("auto");
  const [viewport, setViewport] = useState({ width: 1366, height: 900 });

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
      <header
        className="rounded-2xl p-5 md:p-8 text-white mb-6"
        style={{ background: "linear-gradient(135deg,#7C2D12 0%,#DC2626 60%,#F59E0B 100%)" }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-100">GOTV Engine</p>
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Get Out The Vote</h1>
        <p className="text-white/85 text-sm md:text-base mt-1 max-w-2xl">
          Score, prioritise, and strike off. This is the engine that turns supporters into votes.
        </p>
      </header>

      <section
        className="mb-6 rounded-2xl p-5 md:p-8 text-center border border-red-200 bg-gradient-to-b from-red-50 to-white"
        aria-label="The Gap"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">THE GAP</p>
        <p className="mt-2 text-sm md:text-base text-slate-600">Supporters still needed to reach winning threshold</p>

        <div className="mt-3">
          <p className="text-5xl md:text-7xl font-black tracking-tight text-red-700 tabular-nums">
            {gapData ? gapData.gap.toLocaleString() : "--"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Winning threshold</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">{gapData ? gapData.winThreshold.toLocaleString() : "--"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Supporters voted</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700 tabular-nums">{gapData ? gapData.supportersVoted.toLocaleString() : "--"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Votes needed per hour</p>
            <p className="mt-1 text-2xl font-extrabold text-blue-700 tabular-nums">{gapData ? gapData.pacing.votesNeededPerHour.toLocaleString() : "--"}</p>
          </div>
        </div>

        {gapData && (
          <p className="mt-4 text-sm text-slate-600">
            Supporter turnout is <span className="font-bold text-slate-900 tabular-nums">{gapData.supporterTurnoutPct}%</span>. 
            {" "}General turnout is <span className="font-bold text-slate-900 tabular-nums">{gapData.turnoutPct}%</span>.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">War Room Layout</p>
            <p className="text-sm text-slate-600 mt-1">
              Adaptive canvas tuned for {scope === "single" ? "single campaign" : scope === "regional" ? "regional race cluster" : "national or province-wide command"} operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["single", "regional", "national"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`h-9 px-3 rounded-full text-xs font-semibold border transition-colors ${scope === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}
              >
                {s === "single" ? "Single" : s === "regional" ? "Regional" : "National"}
              </button>
            ))}

            {(["auto", "compact", "comfortable"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`h-9 px-3 rounded-full text-xs font-semibold border transition-colors ${density === d ? "bg-blue-700 text-white border-blue-700" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}
              >
                {d === "auto" ? "Density: Auto" : d === "compact" ? "Compact" : "Comfortable"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Viewport: <span className="font-semibold text-slate-700 tabular-nums">{viewport.width}x{viewport.height}</span>
          {" "}• Map auto-height: <span className="font-semibold text-slate-700 tabular-nums">{mapHeight}px</span>
          {" "}• Scroll profile: <span className="font-semibold text-slate-700">{resolvedDensity === "compact" ? "compressed" : "balanced"}</span>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Supporter density map</p>
        <CampaignMap mode="gotv" height={mapHeight} showControls />
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-4">
        {(
          [
            { id: "priority", label: "Priority List", icon: ListOrdered },
            { id: "strike", label: "Strike Off", icon: Check },
            { id: "upload", label: "Upload Voted", icon: Upload },
            { id: "command", label: "Election Day", icon: Radio },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`shrink-0 h-11 px-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors ${
                isActive ? "bg-red-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-red-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {active === "priority" && <PriorityListTab campaignId={campaignId} />}
      {active === "strike" && <StrikeTab campaignId={campaignId} />}
      {active === "upload" && <UploadTab campaignId={campaignId} />}
      {active === "command" && <CommandTab campaignId={campaignId} />}
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
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Scoring contacts…
      </div>
    );
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

  if (!data) return <div className="text-slate-500 text-center py-12">Loading…</div>;

  const votedPct = data.summary.totals.all > 0
    ? Math.round((data.summary.voted.all / data.summary.totals.all) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Strike-Off Progress</h2>
          <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">{votedPct}%</span>
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
  const [result, setResult] = useState<{ matched?: number; supporters?: number; against?: number; unknown?: number; totalVoters?: number; error?: string } | null>(null);

  async function submit() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      const res = await fetch("/api/gotv/upload-voted", { method: "POST", body: form });
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
          Upload a CSV or XLSX from the poll clerk. We'll fuzzy-match names &amp; addresses to your contacts and mark them voted.
        </p>
        <label className="block">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
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
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? "Matching…" : "Process voted list"}
        </button>
      </div>

      {result && !result.error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <h3 className="font-bold text-emerald-900">Matched {result.matched?.toLocaleString() ?? 0} voters</h3>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div><p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{result.supporters ?? 0}</p><p className="text-xs text-slate-600">Supporters</p></div>
            <div><p className="text-2xl font-extrabold text-red-700 tabular-nums">{result.against ?? 0}</p><p className="text-xs text-slate-600">Against</p></div>
            <div><p className="text-2xl font-extrabold text-slate-700 tabular-nums">{result.unknown ?? 0}</p><p className="text-xs text-slate-600">Unknown</p></div>
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">{result.totalVoters?.toLocaleString() ?? 0} rows in the file</p>
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

  if (!data) return <div className="text-slate-500 text-center py-12">Loading command centre…</div>;

  const maxHourly = Math.max(1, ...data.hourlyVotes.map((h) => h.voted));

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

      {/* Hourly pace chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Hourly voting pace</h2>
          <span className="text-xs text-slate-500 tabular-nums">{data.recentInteractions.toLocaleString()} interactions in last 12h</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {data.hourlyVotes.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end h-24">
                <div
                  className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t"
                  style={{ height: `${(h.voted / maxHourly) * 100}%` }}
                  title={`${h.voted} voted`}
                />
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums">{h.hour}</span>
            </div>
          ))}
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
