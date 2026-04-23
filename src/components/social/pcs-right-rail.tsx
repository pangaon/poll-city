"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  Loader2,
  Clock,
  BarChart2,
  ChevronRight,
  Flame,
  Star,
  ExternalLink,
} from "lucide-react";

/* ── Election countdown ── */
const ELECTION_DATE = new Date("2026-10-26"); // date-only = UTC midnight, consistent server/client

function useCountdown(target: Date) {
  // Initialize to 0 on SSR — useEffect sets the real value client-side only
  // This avoids the SSR/CSR hydration mismatch from Date.now() differences
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const calc = () => setDiff(target.getTime() - Date.now());
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);
  const d = Math.max(0, Math.floor(diff / 86_400_000));
  const h = Math.max(0, Math.floor((diff % 86_400_000) / 3_600_000));
  const m = Math.max(0, Math.floor((diff % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((diff % 60_000) / 1_000));
  return { d, h, m, s };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[36px]">
      <span className="text-2xl font-black text-white tabular-nums leading-none tracking-tight">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</span>
    </div>
  );
}

/* ── Find My Reps widget ── */
interface RepResult {
  id: string;
  name: string;
  title: string | null;
  level: string;
  photoUrl?: string | null;
}

function FindMyReps() {
  const [postal, setPostal] = useState("");
  const [loading, setLoading] = useState(false);
  const [reps, setReps] = useState<RepResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const p = postal.trim().toUpperCase().replace(/\s/g, "");
    if (p.length < 3) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/officials?postalCode=${encodeURIComponent(p)}`);
      const data = await res.json();
      setReps(data.data ?? []);
    } catch {
      setReps([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.07] overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-[#00D4C8]/15 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-[#00D4C8]" />
          </div>
          <h3 className="text-sm font-bold text-white">Find My Reps</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">Enter your postal code to find your elected officials.</p>
      </div>

      <form onSubmit={lookup} className="px-4 py-3 flex gap-2">
        <input
          value={postal}
          onChange={(e) => setPostal(e.target.value.toUpperCase())}
          placeholder="M5V 2T6"
          maxLength={7}
          className="flex-1 h-9 px-3 text-sm font-mono bg-white/[0.05] border border-white/[0.10] focus:border-[#00D4C8]/50 rounded-xl text-white placeholder:text-slate-600 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading || postal.trim().length < 3}
          className="w-9 h-9 rounded-xl bg-[#00D4C8]/20 hover:bg-[#00D4C8]/35 text-[#00D4C8] disabled:opacity-40 flex items-center justify-center transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </button>
      </form>

      <AnimatePresence>
        {searched && (
          <motion.div
            key="results"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {reps.length === 0 && !loading && (
                <p className="text-xs text-slate-500 text-center py-3">No reps found — try a different code.</p>
              )}
              {reps.map((rep) => (
                <Link
                  key={rep.id}
                  href={`/social/politicians/${rep.id}`}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.05] transition-all group"
                >
                  {rep.photoUrl ? (
                    <Image src={rep.photoUrl} alt={rep.name} width={30} height={30} className="rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-full bg-[#1D9E75]/25 flex items-center justify-center text-[#1D9E75] text-xs font-bold flex-shrink-0">
                      {rep.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[#00D4C8] transition-colors">{rep.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{rep.title ?? rep.level}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                </Link>
              ))}
              {reps.length > 0 && (
                <Link
                  href={`/social/officials?postalCode=${postal.trim()}`}
                  className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#00D4C8]/70 hover:text-[#00D4C8] transition-colors pt-2"
                >
                  See all results <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Trending polls ── */
interface TrendingPoll {
  id: string;
  question: string;
  totalResponses: number;
}

function TrendingPolls() {
  const [polls, setPolls] = useState<TrendingPoll[]>([]);

  useEffect(() => {
    fetch("/api/polls")
      .then((r) => r.json())
      .then((d) => setPolls((d.data ?? []).slice(0, 4)))
      .catch(() => {});
  }, []);

  if (polls.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#111827] border border-white/[0.07] overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.05] flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#EF9F27]/15 flex items-center justify-center">
          <Flame className="w-3 h-3 text-[#EF9F27]" />
        </div>
        <h3 className="text-sm font-bold text-white">Trending Polls</h3>
      </div>
      <div className="p-2">
        {polls.map((poll) => (
          <Link
            key={poll.id}
            href={`/social/polls/${poll.id}`}
            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.05] transition-all group"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#EF9F27] flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-relaxed transition-colors">
                {poll.question}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{poll.totalResponses.toLocaleString()} votes</p>
            </div>
          </Link>
        ))}
        <Link
          href="/social/polls"
          className="flex items-center justify-center gap-1.5 mt-1 py-2 text-[11px] font-semibold text-[#EF9F27]/70 hover:text-[#EF9F27] transition-colors"
        >
          All polls <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

/* ── Claim CTA ── */
function ClaimCTA() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#EF9F27]/12 to-[#EF9F27]/4 border border-[#EF9F27]/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-3.5 h-3.5 text-[#EF9F27]" />
        <span className="text-xs font-bold text-[#EF9F27]">Are you an elected official?</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-3">
        Your profile is already here. Claim it free and connect directly with your constituents.
      </p>
      <Link
        href="/social/officials"
        className="flex items-center justify-center h-8 w-full rounded-full bg-[#EF9F27] text-[#080D14] text-xs font-bold hover:bg-[#EF9F27]/90 transition-all"
      >
        Find my profile
      </Link>
    </div>
  );
}

/* ── Main export ── */
export default function PCSRightRail() {
  const { d, h, m, s } = useCountdown(ELECTION_DATE);

  return (
    <>
      {/* ── Election countdown ── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1D9E75]/15 to-[#00D4C8]/5 border border-[#1D9E75]/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#1D9E75]/20 flex items-center justify-center">
            <Clock className="w-3 h-3 text-[#1D9E75]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-300">Ontario Municipal Election</p>
            <p className="text-[10px] text-slate-500">October 26, 2026</p>
          </div>
        </div>
        <div className="flex items-end justify-between px-1">
          <CountdownUnit value={d} label="days" />
          <span className="text-slate-600 font-bold text-lg mb-3">:</span>
          <CountdownUnit value={h} label="hrs" />
          <span className="text-slate-600 font-bold text-lg mb-3">:</span>
          <CountdownUnit value={m} label="min" />
          <span className="text-slate-600 font-bold text-lg mb-3">:</span>
          <CountdownUnit value={s} label="sec" />
        </div>
        <Link
          href="/social/officials?level=municipal"
          className="mt-4 flex items-center justify-center gap-1.5 h-8 w-full rounded-full bg-[#1D9E75]/15 hover:bg-[#1D9E75]/25 text-[#1D9E75] text-[11px] font-bold transition-all"
        >
          View all candidates <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <FindMyReps />
      <TrendingPolls />
      <ClaimCTA />
    </>
  );
}
