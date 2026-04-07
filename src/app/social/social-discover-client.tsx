"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ChevronRight, BarChart2, Users, Search, Award, FileSignature,
  Vote, Trophy, Sparkles, ArrowRight, CheckCircle, Star, TrendingUp,
  Flame, Heart, PenLine,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── types ─────────────────────────────────────────────────────── */
interface Official {
  id: string; name: string; title: string; level: string; district: string;
  party: string | null; photoUrl: string | null; subscriptionStatus: string | null;
  _count: { follows: number };
}

interface Poll {
  id: string; question: string; type: string; totalResponses: number;
  options: { id: string; text: string }[];
}

interface Petition {
  id: string; title: string; signatures: number; goal: number;
  signed: boolean;
}

interface LeaderboardEntry {
  rank: number; name: string; credits: number; badges: number;
}

interface MatchCandidate {
  id: string; name: string; party: string | null; district: string; matchPct: number;
}

/* ── constants ─────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

const LEVEL_COLORS: Record<string, string> = {
  municipal: "bg-emerald-100 text-emerald-700",
  provincial: "bg-blue-100 text-blue-700",
  federal: "bg-purple-100 text-purple-700",
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const MATCH_QUESTIONS = [
  { id: 1, text: "Should municipalities have more power over housing development?", options: ["Strongly agree", "Somewhat agree", "Neutral", "Disagree"] },
  { id: 2, text: "Is public transit investment the top priority for your community?", options: ["Absolutely", "Important but not #1", "Not a priority", "Unsure"] },
  { id: 3, text: "Should elected officials publish monthly spending reports?", options: ["Yes, mandatory", "Encouraged but optional", "Current rules are fine", "No opinion"] },
];

/* ── shimmer skeleton ──────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />
  );
}

/* ── main component ────────────────────────────────────────────── */
export default function SocialDiscover() {
  const [postalCode, setPostalCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);

  // Voter Passport mock state
  const [passport] = useState({
    pollsParticipated: 12,
    petitionsSigned: 5,
    electionsVoted: 3,
    badges: ["Early Voter", "Petition Champion", "First Poll"],
  });

  // Candidate finder
  const [matchStep, setMatchStep] = useState(0); // 0 = not started, 1-3 = questions, 4 = results
  const [matchAnswers, setMatchAnswers] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<MatchCandidate[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  // Petitions
  const [petitions, setPetitions] = useState<Petition[]>([
    { id: "p1", title: "Protect Greenwood Park from Commercial Development", signatures: 1847, goal: 2500, signed: false },
    { id: "p2", title: "Extend TTC Service Hours on Weekends", signatures: 3291, goal: 5000, signed: false },
    { id: "p3", title: "Mandate Bike Lanes on All New Arterial Roads", signatures: 912, goal: 1500, signed: false },
    { id: "p4", title: "Increase Funding for Community Mental Health Clinics", signatures: 4102, goal: 5000, signed: false },
  ]);

  // Leaderboard
  const [leaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: "Sarah M.", credits: 2450, badges: 12 },
    { rank: 2, name: "James K.", credits: 2180, badges: 10 },
    { rank: 3, name: "Priya R.", credits: 1990, badges: 9 },
    { rank: 4, name: "David L.", credits: 1875, badges: 8 },
    { rank: 5, name: "Emily C.", credits: 1720, badges: 7 },
  ]);

  useEffect(() => {
    fetch("/api/polls?featured=true")
      .then(r => r.json())
      .then(d => setPolls(d.data?.slice(0, 3) ?? []));
  }, []);

  async function lookup() {
    if (postalCode.length < 3) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/officials?postalCode=${postalCode.replace(/\s/g, "")}`);
      const data = await res.json();
      setOfficials(data.data ?? []);
      setSubmitted(true);
      const pRes = await fetch(`/api/polls?postalCode=${postalCode.replace(/\s/g, "")}`);
      const pData = await pRes.json();
      setPolls(pData.data?.slice(0, 3) ?? []);
    } finally { setLoading(false); }
  }

  function answerMatch(answer: string) {
    const next = [...matchAnswers, answer];
    setMatchAnswers(next);
    if (next.length < 3) {
      setMatchStep(matchStep + 1);
    } else {
      setMatchLoading(true);
      setMatchStep(4);
      // Simulate matching
      setTimeout(() => {
        setMatchResults([
          { id: "c1", name: "Olivia Chow", party: "Independent", district: "Toronto Centre", matchPct: 92 },
          { id: "c2", name: "Josh Matlow", party: "Independent", district: "Toronto—St. Paul's", matchPct: 85 },
          { id: "c3", name: "Ana Bailao", party: "Independent", district: "Davenport", matchPct: 78 },
        ]);
        setMatchLoading(false);
      }, 1500);
    }
  }

  function signPetition(id: string) {
    setPetitions(prev => prev.map(p =>
      p.id === id ? { ...p, signatures: p.signatures + 1, signed: true } : p
    ));
  }

  function resetMatch() {
    setMatchStep(0);
    setMatchAnswers([]);
    setMatchResults([]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #143A6B)` }} className="px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Vote className="w-5 h-5 text-blue-300" />
          <span className="text-sm font-semibold text-blue-200 uppercase tracking-widest">Poll City Social</span>
        </div>
        <h1 className="text-2xl font-bold mt-3 mb-1">Your civic life, simplified.</h1>
        <p className="text-blue-200 text-sm">Find your reps, vote on issues, make your voice heard.</p>

        <div className="mt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                placeholder="Enter postal code (e.g. M4C 1A1)"
                maxLength={7}
                className="w-full pl-9 pr-3 py-3 bg-white/15 border border-white/25 rounded-xl text-white placeholder:text-blue-300 focus:outline-none focus:bg-white/20 text-sm font-medium tracking-wide min-h-[44px]"
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading || postalCode.length < 3}
              className="px-5 py-3 bg-white font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-blue-50 transition-colors min-h-[44px]"
              style={{ color: NAVY }}
            >
              {loading ? "..." : "Find"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-8 max-w-2xl mx-auto">
        {/* ── Voter Passport ──────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5" style={{ color: GREEN }} />
            <h2 className="font-bold text-gray-900">Voter Passport</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Polls", value: passport.pollsParticipated, icon: BarChart2 },
                { label: "Petitions", value: passport.petitionsSigned, icon: FileSignature },
                { label: "Elections", value: passport.electionsVoted, icon: Vote },
                { label: "Badges", value: passport.badges.length, icon: Star },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-2xl font-bold" style={{ color: NAVY }}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {passport.badges.map(badge => (
                <span key={badge} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#E8F5F0", color: GREEN }}>
                  <Sparkles className="w-3 h-3" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Candidate Finder ────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5" style={{ color: NAVY }} />
            <h2 className="font-bold text-gray-900">Candidate Finder</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            {matchStep === 0 && (
              <div className="text-center py-4">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-600 mb-4">Answer 3 questions, find your match</p>
                <button
                  onClick={() => setMatchStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
                  style={{ background: GREEN }}
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {matchStep >= 1 && matchStep <= 3 && (
                <motion.div
                  key={matchStep}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={spring}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400">Question {matchStep} of 3</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(matchStep / 3) * 100}%`, background: GREEN }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-4">{MATCH_QUESTIONS[matchStep - 1].text}</p>
                  <div className="grid gap-2">
                    {MATCH_QUESTIONS[matchStep - 1].options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => answerMatch(opt)}
                        className="text-left px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors min-h-[44px]"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {matchStep === 4 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                >
                  {matchLoading ? (
                    <div className="space-y-3 py-4">
                      <Shimmer className="h-16 w-full" />
                      <Shimmer className="h-16 w-full" />
                      <Shimmer className="h-16 w-full" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-gray-400 mb-3 uppercase">Your Top Matches</p>
                      <div className="space-y-3">
                        {matchResults.map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring, delay: i * 0.1 }}
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg" style={{ background: NAVY }}>
                              {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.district} {c.party && `\u00B7 ${c.party}`}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold" style={{ color: GREEN }}>{c.matchPct}%</p>
                              <p className="text-xs text-gray-400">match</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <button
                        onClick={resetMatch}
                        className="mt-4 text-xs font-medium text-blue-600 hover:underline"
                      >
                        Retake quiz
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── My Officials ────────────────────────────────────── */}
        {submitted && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />Your Representatives</h2>
              <Link href="/social/officials" className="text-xs text-blue-600 font-medium">See all</Link>
            </div>
            {officials.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No officials found for <strong>{postalCode}</strong></p>
              </div>
            ) : (
              <div className="space-y-2">
                {officials.map((o) => <OfficialCard key={o.id} official={o} />)}
              </div>
            )}
          </motion.section>
        )}

        {/* ── Active Petitions ────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="w-5 h-5" style={{ color: AMBER }} />
            <h2 className="font-bold text-gray-900">Active Petitions</h2>
          </div>
          <div className="space-y-3">
            {petitions.map((p) => (
              <motion.div
                key={p.id}
                layout
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-gray-900 leading-snug mb-3">{p.title}</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: GREEN }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((p.signatures / p.goal) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    <strong className="text-gray-700">{p.signatures.toLocaleString()}</strong> / {p.goal.toLocaleString()} signatures
                  </span>
                  {p.signed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: GREEN, background: "#E8F5F0" }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Signed
                    </span>
                  ) : (
                    <button
                      onClick={() => signPetition(p.id)}
                      className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg min-h-[44px] hover:opacity-90 transition-opacity"
                      style={{ background: GREEN }}
                    >
                      Sign
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Active Polls ────────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-600" />Active Polls</h2>
            <Link href="/social/polls" className="text-xs text-blue-600 font-medium">See all</Link>
          </div>
          {polls.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">No polls available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {polls.map((p) => <PollPreviewCard key={p.id} poll={p} />)}
            </div>
          )}
        </motion.section>

        {/* ── Civic Credits Leaderboard ───────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" style={{ color: AMBER }} />
            <h2 className="font-bold text-gray-900">Civic Credits Leaderboard</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i < leaderboard.length - 1 && "border-b border-gray-100"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  entry.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                  entry.rank === 2 ? "bg-gray-100 text-gray-600" :
                  entry.rank === 3 ? "bg-orange-100 text-orange-600" :
                  "bg-gray-50 text-gray-400"
                )}>
                  {entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{entry.name}</p>
                  <p className="text-xs text-gray-500">{entry.badges} badges</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: NAVY }}>{entry.credits.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">credits</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────── */
function OfficialCard({ official: o }: { official: Official }) {
  return (
    <Link href={`/social/officials/${o.id}`} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all min-h-[44px]">
      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg" style={{ background: NAVY }}>
        {o.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-900 text-sm truncate">{o.name}</p>
          {o.subscriptionStatus === "verified" && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
        </div>
        <p className="text-xs text-gray-500 truncate">{o.title} · {o.district}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", LEVEL_COLORS[o.level] ?? "bg-gray-100 text-gray-600")}>{o.level}</span>
          {o.party && <span className="text-xs text-gray-400">{o.party}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

function PollPreviewCard({ poll: p }: { poll: Poll }) {
  return (
    <Link href={`/social/polls/${p.id}`} className="block p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
      <p className="text-sm font-semibold text-gray-900 leading-snug">{p.question}</p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-gray-400">{p.totalResponses} responses</span>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.type.replace("_", " ")}</span>
      </div>
    </Link>
  );
}
