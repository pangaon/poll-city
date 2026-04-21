import { useEffect, useMemo, useState } from "react";
import { Activity, MonitorUp, Radio, Siren, Users } from "lucide-react";
import { PrecinctSnapshot } from "./war-room-types";

function priorityClasses(priority: PrecinctSnapshot["priority"], active: boolean) {
  if (priority === "critical") {
    return active
      ? "border-red-300 bg-red-500/30 ring-2 ring-red-300"
      : "border-red-500/60 bg-red-500/20 hover:bg-red-500/30";
  }
  if (priority === "watch") {
    return active
      ? "border-amber-300 bg-amber-500/30 ring-2 ring-amber-300"
      : "border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30";
  }
  return active
    ? "border-emerald-300 bg-emerald-500/30 ring-2 ring-emerald-300"
    : "border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30";
}

export function WarRoomMapPanel({ precincts }: { precincts: PrecinctSnapshot[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectionMode, setProjectionMode] = useState(false);
  const [autopilot, setAutopilot] = useState(true);

  const selectedPrecinct = useMemo(() => {
    if (precincts.length === 0) return null;
    if (!selectedId) {
      return [...precincts].sort((a, b) => b.gapVotes - a.gapVotes)[0];
    }
    return precincts.find((item) => item.id === selectedId) ?? precincts[0];
  }, [precincts, selectedId]);

  const dispatchQueue = useMemo(
    () => [...precincts].sort((a, b) => b.gapVotes - a.gapVotes).slice(0, 5),
    [precincts],
  );

  const ticker = useMemo(() => {
    const critical = precincts.filter((p) => p.priority === "critical").length;
    const watch = precincts.filter((p) => p.priority === "watch").length;
    const stable = precincts.filter((p) => p.priority === "stable").length;
    const topGap = [...precincts].sort((a, b) => b.gapVotes - a.gapVotes)[0];

    return [
      `Critical poll divisions: ${critical}`,
      `Watch poll divisions: ${watch}`,
      `Stable poll divisions: ${stable}`,
      topGap ? `Largest gap: ${topGap.name} (${topGap.gapVotes})` : "Largest gap: n/a",
      "Dispatch cadence: 90-second updates",
    ].join("  •  ");
  }, [precincts]);

  const urgencyFeed = useMemo(
    () => [...precincts].sort((a, b) => b.remainingContacts - a.remainingContacts).slice(0, 3),
    [precincts],
  );

  useEffect(() => {
    if (!autopilot || precincts.length === 0) return;

    const ordered = [...precincts].sort((a, b) => b.gapVotes - a.gapVotes);
    const timer = setInterval(() => {
      setSelectedId((current) => {
        if (!current) return ordered[0]?.id ?? null;
        const idx = ordered.findIndex((p) => p.id === current);
        if (idx === -1 || idx === ordered.length - 1) return ordered[0]?.id ?? null;
        return ordered[idx + 1]?.id ?? ordered[0]?.id ?? null;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [autopilot, precincts]);

  return (
    <section className={`rounded-2xl bg-slate-950 p-4 text-white shadow-2xl shadow-slate-900/40 md:p-5 ${projectionMode ? "ring-2 ring-cyan-400/70" : ""}`}>
      <div className="mb-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/70">
        <div className="animate-[pulse_2s_ease-in-out_infinite] bg-red-700 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100">
          Live Election Desk
        </div>
        <div className="overflow-hidden whitespace-nowrap px-2 py-1.5 text-[11px] font-semibold text-slate-200">
          <span className="inline-block animate-[ticker_24s_linear_infinite]">{ticker}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Election Night Board</p>
          <h2 className={`${projectionMode ? "text-2xl md:text-3xl" : "text-xl"} font-black text-white`}>Interactive Poll Division Map</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setProjectionMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${projectionMode ? "border-cyan-300 bg-cyan-500/20 text-cyan-100" : "border-slate-600 bg-slate-800 text-slate-200"}`}
          >
            <MonitorUp className="h-3.5 w-3.5" />
            {projectionMode ? "Projection On" : "Projection Off"}
          </button>
          <button
            type="button"
            onClick={() => setAutopilot((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${autopilot ? "border-violet-300 bg-violet-500/20 text-violet-100" : "border-slate-600 bg-slate-800 text-slate-200"}`}
          >
            <Radio className={`h-3.5 w-3.5 ${autopilot ? "animate-pulse" : ""}`} />
            {autopilot ? "Autopilot On" : "Autopilot Off"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            LIVE COMMAND VIEW
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-8">
          <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Poll Division Status Map</p>
              <p className="text-[11px] text-slate-400">Tap poll division to drill into gap and dispatch.</p>
            </div>
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${projectionMode ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
              {precincts.map((precinct) => {
                const active = selectedPrecinct?.id === precinct.id;
                return (
                  <button
                    key={precinct.id}
                    type="button"
                    onClick={() => setSelectedId(precinct.id)}
                    className={`rounded-lg border p-2 text-left transition-all ${projectionMode ? "min-h-20" : ""} ${priorityClasses(precinct.priority, active)}`}
                  >
                    <p className={`${projectionMode ? "text-sm" : "text-xs"} truncate font-bold text-white`}>{precinct.name}</p>
                    <p className={`${projectionMode ? "text-xs" : "text-[11px]"} text-slate-200`}>Turnout {precinct.turnoutPercent}%</p>
                    <p className={`${projectionMode ? "text-xs" : "text-[11px]"} font-semibold text-white/90`}>Gap {precinct.gapVotes}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Selected Poll Division</p>
            {selectedPrecinct ? (
              <>
                <p className="text-lg font-black text-white">{selectedPrecinct.name}</p>
                <div className="mt-3 space-y-2 text-xs">
                  <StatRow label="Projected Votes" value={selectedPrecinct.projectedVotes.toLocaleString()} />
                  <StatRow label="Target Votes" value={selectedPrecinct.targetVotes.toLocaleString()} />
                  <StatRow label="Gap" value={selectedPrecinct.gapVotes.toLocaleString()} emphasis />
                  <StatRow label="Remaining Contacts" value={selectedPrecinct.remainingContacts.toLocaleString()} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${Math.min(selectedPrecinct.turnoutPercent, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-300">No poll division data available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-12">
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 md:col-span-7">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Siren className="h-3.5 w-3.5 text-red-300" />Dispatch Queue
          </p>
          <div className="space-y-1.5">
            {dispatchQueue.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-800 px-2 py-1.5 text-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate font-semibold text-white">{row.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.max(6, Math.min(100, row.turnoutPercent))}%` }}
                    />
                  </div>
                </div>
                <span className="text-red-300">Gap {row.gapVotes}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 md:col-span-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Activity className="h-3.5 w-3.5 text-cyan-300" />Action Lanes
          </p>
          <div className="space-y-2 text-xs">
            <LaneCard lane="Door Knock" count={Math.max(12, Math.round(dispatchQueue.length * 4.2))} />
            <LaneCard lane="Phone Bank" count={Math.max(16, Math.round(dispatchQueue.length * 5.7))} />
            <LaneCard lane="Ride Assist" count={Math.max(4, Math.round(dispatchQueue.length * 1.8))} />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Urgency Feed</p>
        <div className="grid gap-2 md:grid-cols-3">
          {urgencyFeed.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-700 bg-slate-800/80 p-2.5">
              <p className="text-sm font-bold text-white">{row.name}</p>
              <p className="text-xs text-slate-300">Remaining contacts: {row.remainingContacts}</p>
              <p className="mt-1 text-xs font-semibold text-amber-300">Target gap: {row.gapVotes}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </section>
  );
}

function StatRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={emphasis ? "font-bold text-red-300" : "font-semibold text-white"}>{value}</span>
    </div>
  );
}

function LaneCard({ lane, count }: { lane: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-slate-200">
        <Users className="h-3.5 w-3.5 text-cyan-300" />{lane}
      </span>
      <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 font-bold text-cyan-200">{count}</span>
    </div>
  );
}
