"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type TvMode =
  | "war-room"
  | "gotv-tracker"
  | "volunteer-leaderboard"
  | "results-night"
  | "social-wall"
  | "fundraising-thermometer"
  | "election-day-ops";

const MODES: Array<{ id: TvMode; label: string }> = [
  { id: "war-room", label: "War Room" },
  { id: "gotv-tracker", label: "GOTV Tracker" },
  { id: "volunteer-leaderboard", label: "Volunteer Leaderboard" },
  { id: "results-night", label: "Results Night" },
  { id: "social-wall", label: "Social Wall" },
  { id: "fundraising-thermometer", label: "Fundraising Thermometer" },
  { id: "election-day-ops", label: "Election Day Ops" },
];

export default function TvModeClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const rotation = Number(searchParams.get("rotation") || 25);
  const [modeIndex, setModeIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const mode = MODES[modeIndex]?.id ?? "war-room";

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setModeIndex((prev) => (prev + 1) % MODES.length);
    }, Math.max(10, rotation) * 1000);
    return () => window.clearInterval(timer);
  }, [paused, rotation]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        setPaused((prev) => !prev);
      } else if (event.key === "ArrowRight") {
        setModeIndex((prev) => (prev + 1) % MODES.length);
      } else if (event.key === "ArrowLeft") {
        setModeIndex((prev) => (prev - 1 + MODES.length) % MODES.length);
      } else if (event.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen();
        } else {
          void document.exitFullscreen();
        }
      } else if (/^[1-7]$/.test(event.key)) {
        setModeIndex(Number(event.key) - 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const view = useMemo(() => {
    if (mode === "war-room") {
      return (
        <div className="min-h-screen bg-[#0a0e1a] text-white p-8 grid grid-rows-[auto_1fr_auto] gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{slug.replace(/-/g, " ")} War Room</h1>
            <p className="text-lg">Countdown: 42d 11h 08m</p>
          </div>
          <div className="grid place-items-center">
            <p className="text-7xl font-black">12,845 supporters</p>
          </div>
          <div className="text-sm text-blue-100">Activity ticker: Volunteer check-in, turf complete, new donor, call list updated.</div>
        </div>
      );
    }

    if (mode === "gotv-tracker") {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
          <h1 className="text-3xl font-bold">GOTV Tracker</h1>
          <p className="mt-6 text-8xl font-black">9,214</p>
          <p className="text-2xl text-slate-300">Supporters voted / total supporters</p>
          <div className="mt-6 h-6 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: "63%" }} />
          </div>
          <p className="mt-2 text-slate-300">63% progress</p>
        </div>
      );
    }

    if (mode === "volunteer-leaderboard") {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
          <h1 className="text-3xl font-bold mb-6">Volunteer Leaderboard</h1>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-800 p-4 flex items-center justify-between">
                <p className="text-xl font-semibold">#{i + 1} Volunteer {i + 1}</p>
                <p className="text-3xl font-black">{340 - i * 17}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (mode === "results-night") {
      return (
        <div className="min-h-screen bg-[#111827] text-white p-8 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-xl bg-slate-800 p-6">
            <h1 className="text-3xl font-bold">Results Night</h1>
            <p className="mt-3 text-5xl font-black">Candidate 14,382 | Opponent 13,904</p>
            <p className="mt-2 text-emerald-400 text-xl font-semibold">Leading +478</p>
          </div>
          <div className="rounded-xl bg-slate-800 p-6">
            <p className="text-sm text-slate-300">Poll-by-poll feed</p>
            <div className="mt-3 space-y-2 text-sm">
              <p>Poll 001 reported</p>
              <p>Poll 007 reported</p>
              <p>Poll 012 reported</p>
              <p>Poll 019 reported</p>
            </div>
          </div>
        </div>
      );
    }

    if (mode === "social-wall") {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
          <h1 className="text-3xl font-bold">Social Wall</h1>
          <div className="mt-5 space-y-3">
            {[
              "Great turnout at the doors tonight",
              "Proud to volunteer for this campaign",
              "Huge momentum in Ward 8",
              "Thanks to everyone making calls",
            ].map((post) => (
              <div key={post} className="rounded-xl bg-slate-800 px-4 py-3 text-lg">{post}</div>
            ))}
          </div>
        </div>
      );
    }

    if (mode === "fundraising-thermometer") {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="mx-auto h-[520px] w-24 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div className="h-[68%] mt-auto bg-emerald-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Fundraising Thermometer</h1>
            <p className="mt-4 text-6xl font-black">$204,700</p>
            <p className="text-xl text-slate-300">of $300,000 goal</p>
            <div className="mt-6 text-slate-300 text-lg">Recent donors: Alex, Jordan, Riley, Sam</div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold">Election Day Ops</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Voted counter", "9,214"],
            ["Volunteers deployed", "132"],
            ["Turfs covered", "84"],
            ["Calls made", "2,903"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-800 p-5">
              <p className="text-sm text-slate-300">{label}</p>
              <p className="mt-2 text-4xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }, [mode, slug]);

  return (
    <div>
      {view}
      <div className="fixed left-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-white">
        <p>Mode: {MODES[modeIndex].label}</p>
        <p>Rotation: {rotation}s {paused ? "(paused)" : ""}</p>
        <p>Keys: Space pause, arrows next or prev, F fullscreen, 1-7 jump</p>
      </div>
    </div>
  );
}
