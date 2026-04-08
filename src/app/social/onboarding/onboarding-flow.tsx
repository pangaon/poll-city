"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Check, ChevronRight, ChevronDown, ChevronUp,
  Bell, Mail, User, Lock, LogIn,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

/* ─────────────────────────────────────────────────────── types */

type Screen = "postal" | "live_polls" | "notify" | "demographics" | "topics" | "account";

interface PollRow {
  id: string;
  question: string;
  type: string;
  totalResponses: number;
  options: { id: string; text: string }[];
}

interface FlowState {
  screen: Screen;
  postalCode: string;
  postalResolved: {
    ward: string | null;
    municipality: string | null;
    province: string | null;
    provinceName: string | null;
    formattedPostal: string;
  } | null;
  nearbyPolls: PollRow[];
  votedPollIds: string[];
  notifyPolls: boolean;
  notifyResults: boolean;
  notifyEmergency: boolean;
  email: string;
  ageRange: string;
  sector: string;
  topics: string[];
  guestToken: string;
  consentGiven: boolean;
}

/* ─────────────────────────────────────────────────────── constants */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const SCREENS: Screen[] = ["postal", "live_polls", "notify", "demographics", "topics", "account"];
const VISIBLE_DOTS = 5; // account not shown until end
const AGE_RANGES = ["18–24", "25–34", "35–49", "50–64", "65+"];
const SECTORS = ["Public sector", "Private sector", "Non-profit", "Student", "Retired"];
const TOPICS = [
  "Housing", "Transit", "Budget & Taxes", "Public Safety",
  "Environment", "Education", "Healthcare", "Labour",
  "Zoning", "Infrastructure", "Arts & Culture", "Immigration",
];

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ─────────────────────────────────────────────────────── helpers */

function formatPostal(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + " " + clean.slice(3, 6);
}

function areaLabel(
  resolved: FlowState["postalResolved"]
): string {
  if (!resolved) return "your area";
  return resolved.ward ?? resolved.municipality ?? resolved.provinceName ?? "your area";
}

/* ─────────────────────────────────────────────────────── shimmer */

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className ?? ""}`} />;
}

/* ─────────────────────────────────────────────────────── progress dots */

function ProgressDots({ current }: { current: Screen }) {
  const idx = SCREENS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: VISIBLE_DOTS }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            backgroundColor: i === idx ? NAVY : i < idx ? GREEN : "#D1D5DB",
            scale: i === idx ? 1.2 : 1,
          }}
          transition={spring}
          className="rounded-full"
          style={{ width: i === idx ? 10 : 8, height: i === idx ? 10 : 8 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── nav buttons */

interface NavProps {
  screen: Screen;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}

function NavButtons({ screen, onBack, onNext, nextDisabled, skipLabel, onSkip }: NavProps) {
  const idx = SCREENS.indexOf(screen);
  const showSkip = ["notify", "demographics", "topics"].includes(screen);

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between gap-4">
        {idx > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 min-h-[44px]"
          style={{ background: NAVY }}
        >
          {screen === "account" ? "Create account" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {showSkip && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSkip ?? onNext}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            {skipLabel ?? "Skip this step"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 1: Postal */

interface PostalScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onNext: () => void;
}

function PostalScreen({ state, setState, onNext }: PostalScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);

  async function resolvePostal() {
    const clean = state.postalCode.replace(/\s/g, "");
    if (clean.length < 3) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/social/resolve-postal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postalCode: clean }),
      });
      const json = await res.json();
      if (!res.ok || !json.data) {
        setError("We couldn't find that postal code. Try just the first three characters (e.g. M4C).");
        return;
      }
      setState((s) => ({ ...s, postalResolved: json.data }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const nextDisabled = !state.postalResolved || !state.consentGiven;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Where do you vote?</h1>
      <p className="text-sm text-gray-500 mb-6">
        We&apos;ll show you polls and officials for your area.
      </p>

      <div className="relative mb-3">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={state.postalCode}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              postalCode: formatPostal(e.target.value),
              postalResolved: null,
            }))
          }
          onKeyDown={(e) => e.key === "Enter" && resolvePostal()}
          placeholder="M4C 1A1"
          maxLength={7}
          className={`w-full pl-9 pr-24 py-3 border rounded-xl text-sm font-medium tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30 transition-all ${
            loading ? "bg-gray-100 animate-pulse" : "bg-white"
          } border-gray-200`}
          style={{ letterSpacing: "0.12em" }}
        />
        <button
          type="button"
          onClick={resolvePostal}
          disabled={loading || state.postalCode.replace(/\s/g, "").length < 3}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity"
          style={{ background: NAVY }}
        >
          {loading ? "..." : "Look up"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <AnimatePresence>
        {state.postalResolved && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: "#E8F5F0" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: 0.1 }}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: GREEN }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold" style={{ color: GREEN }}>
                You&apos;re in {areaLabel(state.postalResolved)}
              </p>
              <p className="text-xs text-gray-500">
                {state.postalResolved.formattedPostal} · {state.postalResolved.provinceName ?? state.postalResolved.province}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIPEDA consent */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-2">
        <button
          type="button"
          onClick={() => setConsentOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-medium text-gray-600">Privacy &amp; consent</span>
          {consentOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {consentOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-white">
                <p className="mb-2">
                  Poll City collects your location to show relevant civic content. Your data is never sold.
                  You can delete your account and all data at any time.
                </p>
                <Link
                  href="/privacy"
                  className="underline text-blue-600 hover:text-blue-800"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <label className="flex items-center gap-3 cursor-pointer py-2">
        <input
          type="checkbox"
          checked={state.consentGiven}
          onChange={(e) =>
            setState((s) => ({ ...s, consentGiven: e.target.checked }))
          }
          className="w-4 h-4 rounded accent-[#0A2342] cursor-pointer"
        />
        <span className="text-sm text-gray-700">I understand and agree</span>
      </label>

      <NavButtons
        screen="postal"
        onBack={() => {}}
        onNext={onNext}
        nextDisabled={nextDisabled}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 2: Live Polls */

interface LivePollsScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onBack: () => void;
  onNext: () => void;
}

function LivePollsScreen({ state, setState, onBack, onNext }: LivePollsScreenProps) {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [civicCreditVisible, setCivicCreditVisible] = useState(false);
  const [votedLocal, setVotedLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (state.nearbyPolls.length > 0) {
          setPolls(state.nearbyPolls.slice(0, 3));
        } else {
          const res = await fetch("/api/polls?featured=true");
          const json = await res.json();
          setPolls(json.data?.slice(0, 3) ?? []);
        }
      } catch {
        setPolls([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [state.nearbyPolls]);

  async function castVote(pollId: string, value: string) {
    if (votedLocal[pollId]) return;
    setVotedLocal((v) => ({ ...v, [pollId]: value }));
    const wasFirst = state.votedPollIds.length === 0;
    setState((s) => ({
      ...s,
      votedPollIds: s.votedPollIds.includes(pollId)
        ? s.votedPollIds
        : [...s.votedPollIds, pollId],
    }));
    if (wasFirst) {
      setCivicCreditVisible(true);
      setTimeout(() => setCivicCreditVisible(false), 2200);
    }
    try {
      await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, guestToken: state.guestToken }),
      });
    } catch {
      // silent — local state already updated
    }
  }

  const area = areaLabel(state.postalResolved);

  return (
    <div className="relative">
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Here&apos;s what people in {area} are talking about
      </h1>
      <p className="text-sm text-gray-500 mb-5">
        Vote on a live poll to see where your community stands.
      </p>

      {loading ? (
        <div className="space-y-3 mb-5">
          <Shimmer className="h-28" />
          <Shimmer className="h-28" />
          <Shimmer className="h-28" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm mb-5">
          No polls available right now.
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              voted={votedLocal[poll.id] ?? null}
              onVote={(v) => castVote(poll.id, v)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-center text-gray-400 mb-4">
        12,847 people across Canada voted today
      </p>

      {/* Civic credit animation */}
      <AnimatePresence>
        {civicCreditVisible && (
          <motion.div
            key="civic-credit"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg pointer-events-none z-50"
            style={{ background: GREEN }}
          >
            +1 civic credit
          </motion.div>
        )}
      </AnimatePresence>

      <NavButtons
        screen="live_polls"
        onBack={onBack}
        onNext={onNext}
        skipLabel="Skip for now"
        onSkip={onNext}
      />
    </div>
  );
}

/* poll card sub-component */

interface PollCardProps {
  poll: PollRow;
  voted: string | null;
  onVote: (value: string) => void;
}

function PollCard({ poll, voted, onVote }: PollCardProps) {
  const [sliderVal, setSliderVal] = useState(50);

  if (voted) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-xl">
        <p className="text-sm font-medium text-gray-800 mb-2">{poll.question}</p>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: GREEN }}
          >
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium" style={{ color: GREEN }}>
            Vote recorded
          </span>
        </div>
      </div>
    );
  }

  const isBinary =
    poll.type === "binary" ||
    (poll.options.length === 2 &&
      poll.options.some((o) => o.text.toLowerCase() === "yes") &&
      poll.options.some((o) => o.text.toLowerCase() === "no"));

  const isSlider = poll.type === "slider";
  const isMultiple = poll.type === "multiple_choice";

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-gray-900 leading-snug">{poll.question}</p>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap flex-shrink-0">
          {poll.type.replace("_", " ")}
        </span>
      </div>

      {isBinary && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onVote("yes")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 border-[#0A2342] text-[#0A2342] hover:bg-[#0A2342] hover:text-white transition-colors min-h-[44px]"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onVote("no")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px]"
          >
            No
          </button>
        </div>
      )}

      {isMultiple && poll.options.length > 0 && (
        <div className="space-y-2">
          {poll.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(opt.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#0A2342] hover:bg-blue-50 transition-colors min-h-[44px]"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {isSlider && (
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            value={sliderVal}
            onChange={(e) => setSliderVal(Number(e.target.value))}
            className="w-full accent-[#0A2342]"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span className="font-medium text-gray-700">{sliderVal}</span>
            <span>100</span>
          </div>
          <button
            type="button"
            onClick={() => onVote(String(sliderVal))}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white min-h-[44px]"
            style={{ background: NAVY }}
          >
            Submit
          </button>
        </div>
      )}

      {!isBinary && !isMultiple && !isSlider && (
        <Link
          href={`/social/polls/${poll.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          Vote <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 3: Notify */

interface NotifyScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onBack: () => void;
  onNext: () => void;
}

function NotifyScreen({ state, setState, onBack, onNext }: NotifyScreenProps) {
  return (
    <div>
      <Bell className="w-8 h-8 mb-4" style={{ color: NAVY }} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Stay in the loop</h1>
      <p className="text-sm text-gray-500 mb-6">
        Get notified when new polls open near you.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden mb-6">
        <div className="px-4">
          <ToggleSwitch
            checked={state.notifyPolls}
            onChange={(v) => setState((s) => ({ ...s, notifyPolls: v }))}
            label="New polls in my area"
          />
        </div>
        <div className="px-4">
          <ToggleSwitch
            checked={state.notifyResults}
            onChange={(v) => setState((s) => ({ ...s, notifyResults: v }))}
            label="When polls close with results"
          />
        </div>
        <div className="px-4">
          <ToggleSwitch
            checked={state.notifyEmergency}
            onChange={(v) => setState((s) => ({ ...s, notifyEmergency: v }))}
            label="Emergency civic alerts only"
            description="Critical municipal and provincial alerts"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Or enter your email for notifications
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={state.email}
            onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
            placeholder="your@email.com"
            className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
          />
        </div>
      </div>

      <NavButtons
        screen="notify"
        onBack={onBack}
        onNext={onNext}
        skipLabel="Maybe later"
        onSkip={onNext}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 4: Demographics */

interface DemographicsScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onBack: () => void;
  onNext: () => void;
}

function DemographicsScreen({ state, setState, onBack, onNext }: DemographicsScreenProps) {
  return (
    <div>
      <User className="w-8 h-8 mb-4" style={{ color: NAVY }} />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Help us show you relevant results
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Anonymous. Never sold. Helps show you how different groups voted.
      </p>

      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Age</p>
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map((age) => (
            <motion.button
              key={age}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() =>
                setState((s) => ({ ...s, ageRange: s.ageRange === age ? "" : age }))
              }
              className="px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]"
              style={
                state.ageRange === age
                  ? { background: NAVY, color: "#fff", borderColor: NAVY }
                  : { background: "#fff", color: "#6B7280", borderColor: "#D1D5DB" }
              }
            >
              {age}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sector</p>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((sec) => (
            <motion.button
              key={sec}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() =>
                setState((s) => ({ ...s, sector: s.sector === sec ? "" : sec }))
              }
              className="px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]"
              style={
                state.sector === sec
                  ? { background: NAVY, color: "#fff", borderColor: NAVY }
                  : { background: "#fff", color: "#6B7280", borderColor: "#D1D5DB" }
              }
            >
              {sec}
            </motion.button>
          ))}
        </div>
      </div>

      <NavButtons
        screen="demographics"
        onBack={onBack}
        onNext={onNext}
        skipLabel="Skip this step"
        onSkip={onNext}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 5: Topics */

interface TopicsScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onBack: () => void;
  onNext: () => void;
}

function TopicsScreen({ state, setState, onBack, onNext }: TopicsScreenProps) {
  function toggle(topic: string) {
    setState((s) => ({
      ...s,
      topics: s.topics.includes(topic)
        ? s.topics.filter((t) => t !== topic)
        : [...s.topics, topic],
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        What issues matter to you?
      </h1>
      <p className="text-sm text-gray-500 mb-5">We&apos;ll show these topics first.</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {TOPICS.map((topic) => {
          const selected = state.topics.includes(topic);
          return (
            <motion.button
              key={topic}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => toggle(topic)}
              className="px-2 py-2.5 rounded-xl text-xs font-medium border transition-colors text-center leading-snug min-h-[44px]"
              style={
                selected
                  ? { background: NAVY, color: "#fff", borderColor: NAVY }
                  : { background: "#fff", color: "#6B7280", borderColor: "#D1D5DB" }
              }
            >
              {topic}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {state.topics.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="text-xs mb-2"
            style={{ color: GREEN }}
          >
            Polls on {state.topics.slice(0, 3).join(", ")}
            {state.topics.length > 3 ? ` +${state.topics.length - 3} more` : ""} will appear first
          </motion.p>
        )}
      </AnimatePresence>

      <NavButtons
        screen="topics"
        onBack={onBack}
        onNext={onNext}
        skipLabel="Skip this step"
        onSkip={onNext}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Screen 6: Account */

interface AccountScreenProps {
  state: FlowState;
  setState: React.Dispatch<React.SetStateAction<FlowState>>;
  onBack: () => void;
}

function AccountScreen({ state, setState, onBack }: AccountScreenProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accountError, setAccountError] = useState("");

  async function saveAndRedirect() {
    try {
      await fetch("/api/social/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestToken: state.guestToken,
          postalCode: state.postalCode,
          postalResolved: state.postalResolved,
          notifyPolls: state.notifyPolls,
          notifyResults: state.notifyResults,
          notifyEmergency: state.notifyEmergency,
          email: state.email,
          ageRange: state.ageRange,
          sector: state.sector,
          topics: state.topics,
          consentGiven: state.consentGiven,
        }),
      });
    } catch {
      // best-effort
    }
    router.push("/social");
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!state.email || !password) return;
    setSubmitting(true);
    setAccountError("");
    try {
      // No /api/auth/register exists — redirect to /join with pre-filled email
      const url = `/join?email=${encodeURIComponent(state.email)}`;
      router.push(url);
    } catch {
      setAccountError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Save your Civic Passport</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your votes are already recorded. Create an account to track them over time.
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Email + password form */}
        <div className="flex-1">
          <form onSubmit={handleCreateAccount} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={state.email}
                onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                placeholder="Email address"
                required
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={8}
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/30"
              />
            </div>
            {accountError && (
              <p className="text-xs text-red-500">{accountError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]"
              style={{ background: NAVY }}
            >
              {submitting ? "..." : "Create account"}
            </button>
          </form>
        </div>

        {/* Or divider + Google */}
        <div className="flex md:flex-col items-center gap-3 md:gap-2">
          <div className="flex-1 md:w-px md:flex-none h-px md:h-full bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">or</span>
          <div className="flex-1 md:w-px md:flex-none h-px md:h-full bg-gray-200" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <a
            href="/api/auth/signin/google"
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            Continue with Google
          </a>
        </div>
      </div>

      <div className="mt-6 text-center space-y-3">
        <button
          type="button"
          onClick={saveAndRedirect}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          Continue without an account →
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── main flow */

const INITIAL_STATE: Omit<FlowState, "guestToken"> = {
  screen: "postal",
  postalCode: "",
  postalResolved: null,
  nearbyPolls: [],
  votedPollIds: [],
  notifyPolls: true,
  notifyResults: true,
  notifyEmergency: false,
  email: "",
  ageRange: "",
  sector: "",
  topics: [],
  consentGiven: false,
};

export default function OnboardingFlow() {
  const [state, setState] = useState<FlowState>({
    ...INITIAL_STATE,
    guestToken: "",
  });
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // init guestToken from sessionStorage on mount
  useEffect(() => {
    let token = "";
    try {
      token = sessionStorage.getItem("civic_guest_token") ?? "";
      if (!token) {
        token = crypto.randomUUID();
        sessionStorage.setItem("civic_guest_token", token);
      }
    } catch {
      token = crypto.randomUUID();
    }
    setState((s) => ({ ...s, guestToken: token }));
  }, []);

  // debounced auto-save
  const autoSave = useCallback(
    (current: FlowState) => {
      if (!current.consentGiven || !current.guestToken) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch("/api/social/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              guestToken: current.guestToken,
              postalCode: current.postalCode,
              postalResolved: current.postalResolved,
              notifyPolls: current.notifyPolls,
              notifyResults: current.notifyResults,
              notifyEmergency: current.notifyEmergency,
              email: current.email,
              ageRange: current.ageRange,
              sector: current.sector,
              topics: current.topics,
              consentGiven: current.consentGiven,
            }),
          });
        } catch {
          // silent
        }
      }, 800);
    },
    []
  );

  // fire autosave whenever state changes (after consent)
  useEffect(() => {
    autoSave(state);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, autoSave]);

  // also fetch nearbyPolls when postal resolves
  useEffect(() => {
    if (!state.postalResolved || state.nearbyPolls.length > 0) return;
    const clean = state.postalCode.replace(/\s/g, "");
    fetch("/api/social/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestToken: state.guestToken,
        postalCode: clean,
        postalResolved: state.postalResolved,
        consentGiven: state.consentGiven,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.nearbyPolls) {
          setState((s) => ({ ...s, nearbyPolls: json.data.nearbyPolls }));
        }
      })
      .catch(() => {});
  }, [state.postalResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const idx = SCREENS.indexOf(state.screen);
    if (idx < SCREENS.length - 1) {
      setDirection(1);
      setState((s) => ({ ...s, screen: SCREENS[idx + 1] }));
    }
  }

  function retreat() {
    const idx = SCREENS.indexOf(state.screen);
    if (idx > 0) {
      setDirection(-1);
      setState((s) => ({ ...s, screen: SCREENS[idx - 1] }));
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* header logo */}
        <div className="text-center mb-6">
          <Link href="/social" className="inline-block">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: NAVY }}>
              Poll City Social
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-gray-100 p-6 overflow-hidden">
          <ProgressDots current={state.screen} />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={state.screen}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
            >
              {state.screen === "postal" && (
                <PostalScreen state={state} setState={setState} onNext={advance} />
              )}
              {state.screen === "live_polls" && (
                <LivePollsScreen
                  state={state}
                  setState={setState}
                  onBack={retreat}
                  onNext={advance}
                />
              )}
              {state.screen === "notify" && (
                <NotifyScreen
                  state={state}
                  setState={setState}
                  onBack={retreat}
                  onNext={advance}
                />
              )}
              {state.screen === "demographics" && (
                <DemographicsScreen
                  state={state}
                  setState={setState}
                  onBack={retreat}
                  onNext={advance}
                />
              )}
              {state.screen === "topics" && (
                <TopicsScreen
                  state={state}
                  setState={setState}
                  onBack={retreat}
                  onNext={advance}
                />
              )}
              {state.screen === "account" && (
                <AccountScreen state={state} setState={setState} onBack={retreat} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
