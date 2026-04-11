"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Star, MessageSquare, Phone, Mail, Globe,
  ChevronDown, ChevronUp, CheckCircle, Send, Heart, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import NotificationOptInPrompt from "@/components/social/notification-opt-in-prompt";

interface LinkedCampaign {
  id: string;
  name: string;
  slug: string;
  candidateName: string | null;
  candidateTitle: string | null;
}

interface Official {
  id: string; name: string; title: string; level: string; district: string;
  party: string | null; bio: string | null; email: string | null; phone: string | null;
  website: string | null; subscriptionStatus: string | null;
  _count: { follows: number; questions: number };
  campaigns: LinkedCampaign[];
}

interface Question {
  id: string; question: string; answer: string | null; answeredAt: string | null;
  upvotes: number; createdAt: string;
  user: { name: string | null };
}

const LEVEL_COLORS: Record<string, string> = {
  municipal:  "bg-emerald-100 text-emerald-700",
  provincial: "bg-blue-100 text-blue-700",
  federal:    "bg-purple-100 text-purple-700",
};

const SCOPE_LABELS: Record<string, string> = {
  campaign_awareness: "notify this campaign that you support them",
  sign_installation:  "contact you to arrange a lawn sign",
  volunteer_contact:  "contact you about volunteering",
  do_not_contact:     "note that you prefer no contact",
};

// ── Disclosure modal ────────────────────────────────────────────────────────
// Shown before any POST /api/social/signal that targets a specific campaign.
// User must explicitly confirm before the signal is sent.

interface DisclosureModalProps {
  campaign: LinkedCampaign;
  signalType: string;
  postalCode?: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

function DisclosureModal({ campaign, signalType, postalCode, onConfirm, onCancel, submitting }: DisclosureModalProps) {
  const scopeKey =
    signalType === "volunteer_interest" ? "volunteer_contact" :
    signalType === "sign_request"       ? "sign_installation" :
    signalType === "do_not_contact"     ? "do_not_contact" :
    "campaign_awareness";

  const scopeLabel = SCOPE_LABELS[scopeKey] ?? "contact you";
  const candidateLabel = campaign.candidateName ?? campaign.name;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-5 pt-5 pb-4 text-white relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <Heart className="w-7 h-7 mb-2 opacity-90" />
          <h2 className="font-bold text-base leading-snug">Support {candidateLabel}?</h2>
          <p className="text-blue-200 text-xs mt-0.5">{campaign.name}</p>
        </div>

        {/* Disclosure body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            By confirming, you allow this campaign to{" "}
            <span className="font-semibold text-gray-900">{scopeLabel}</span>.
          </p>

          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              What will be shared
            </p>
            <ul className="space-y-1">
              <li className="text-xs text-gray-700 flex items-start gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                That you expressed support
              </li>
              {postalCode && (
                <li className="text-xs text-gray-700 flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Your postal code ({postalCode})
                </li>
              )}
            </ul>
            <ul className="space-y-1 mt-2">
              <li className="text-xs text-gray-400 flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                Your name, email, or phone — not shared
              </li>
              <li className="text-xs text-gray-400 flex items-start gap-1.5">
                <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                Your poll responses or activity — not shared
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-400">
            You can revoke this at any time from your{" "}
            <a href="/social/profile" className="text-blue-600 underline underline-offset-2">
              profile
            </a>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
          >
            {submitting ? "Sending…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function OfficialDetailPage() {
  const params = useParams();
  const officialId = (params?.id ?? "") as string;
  const router = useRouter();

  const [official, setOfficial]       = useState<Official | null>(null);
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [loading, setLoading]         = useState(true);
  const [following, setFollowing]     = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());

  // Disclosure modal state
  const [pendingSignal, setPendingSignal] = useState<{
    campaign: LinkedCampaign;
    signalType: string;
  } | null>(null);
  const [signalSubmitting, setSignalSubmitting] = useState(false);

  // Notification opt-in prompt state — shown after follow or support signal
  const [pendingOptIn, setPendingOptIn] = useState<{
    campaignId: string;
    candidateName: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/officials/${officialId}`).then(r => r.json()),
      fetch(`/api/officials/${officialId}/questions`).then(r => r.json()),
    ]).then(([off, qs]) => {
      setOfficial(off.data);
      setQuestions(qs.data ?? []);
      setLoading(false);
    });
  }, [officialId]);

  // Follow the official — no bridge trigger (no campaignSlug → no CRM write)
  async function follow() {
    const res = await fetch("/api/social/signal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officialId: officialId, type: "strong_support" }),
    });
    if (res.ok) {
      setFollowing(true);
      toast.success("Following!");
      // Show opt-in for first linked campaign if any
      if (official?.campaigns.length) {
        const c = official.campaigns[0];
        setPendingOptIn({ campaignId: c.id, candidateName: c.candidateName ?? c.name });
      }
    } else toast.error("Sign in to follow");
  }

  // Open disclosure modal before sending a campaign-targeted signal
  function requestCampaignSignal(campaign: LinkedCampaign, signalType: string) {
    setPendingSignal({ campaign, signalType });
  }

  // User confirmed disclosure — now send the signal with campaignSlug
  async function submitCampaignSignal() {
    if (!pendingSignal) return;
    setSignalSubmitting(true);
    try {
      const res = await fetch("/api/social/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialId:   officialId,
          campaignSlug: pendingSignal.campaign.slug,
          type:         pendingSignal.signalType,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.data?.reason === "already_recorded") {
          toast.info("You've already sent support to this campaign.");
        } else {
          toast.success("Support sent! The campaign has been notified.");
          // Offer push notification opt-in for this campaign
          setPendingOptIn({
            campaignId: pendingSignal.campaign.id,
            candidateName: pendingSignal.campaign.candidateName ?? pendingSignal.campaign.name,
          });
        }
        setPendingSignal(null);
      } else {
        toast.error(json.error ?? "Something went wrong. Please try again.");
      }
    } finally {
      setSignalSubmitting(false);
    }
  }

  async function askQuestion() {
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/officials/${officialId}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion }),
      });
      if (res.ok) {
        toast.success("Question submitted!");
        setNewQuestion("");
        const qs = await fetch(`/api/officials/${officialId}/questions`).then(r => r.json());
        setQuestions(qs.data ?? []);
      } else toast.error("Must be signed in to ask questions");
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="px-4 pt-12 space-y-4">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (!official) return (
    <div className="px-4 pt-12 text-center text-gray-400">Official not found</div>
  );

  return (
    <div className="pb-24">
      {/* Disclosure modal — rendered outside the page flow */}
      {pendingSignal && (
        <DisclosureModal
          campaign={pendingSignal.campaign}
          signalType={pendingSignal.signalType}
          onConfirm={submitCampaignSignal}
          onCancel={() => setPendingSignal(null)}
          submitting={signalSubmitting}
        />
      )}

      {/* Notification opt-in prompt — shown after follow / support signal */}
      {pendingOptIn && (
        <NotificationOptInPrompt
          campaignId={pendingOptIn.campaignId}
          candidateName={pendingOptIn.candidateName}
          onDismiss={() => setPendingOptIn(null)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-4 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-200 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0">
            {official.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl">{official.name}</h1>
              {official.subscriptionStatus === "verified" && (
                <CheckCircle className="w-5 h-5 text-blue-300 flex-shrink-0" />
              )}
            </div>
            <p className="text-blue-200 text-sm">{official.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", LEVEL_COLORS[official.level] ?? "bg-gray-100 text-gray-600")}>
                {official.level}
              </span>
              <span className="text-blue-200 text-xs">{official.district}</span>
              {official.party && <span className="text-blue-300 text-xs">· {official.party}</span>}
            </div>
            <p className="text-blue-200 text-xs mt-1">
              {official._count.follows} followers · {official._count.questions} questions
            </p>
          </div>
        </div>

        {/* Follow + contact buttons */}
        <div className="flex gap-2 mt-4">
          <button onClick={follow} disabled={following}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95",
              following ? "bg-white/20 text-white" : "bg-white text-blue-700 hover:bg-blue-50")}>
            <Star className="w-4 h-4" />{following ? "Following" : "Follow"}
          </button>
          {official.email && (
            <a href={`mailto:${official.email}`}
              className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          )}
          {official.phone && (
            <a href={`tel:${official.phone}`}
              className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors">
              <Phone className="w-5 h-5" />
            </a>
          )}
          {official.website && (
            <a href={official.website} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors">
              <Globe className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Bio */}
        {official.bio && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2 text-sm">About</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{official.bio}</p>
          </div>
        )}

        {/* Support campaign — only shown if official has linked active campaigns */}
        {official.campaigns.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-1 text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />Support their campaign
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Let the campaign know you support them. You control what's shared.
            </p>
            <div className="space-y-2">
              {official.campaigns.map(campaign => (
                <div key={campaign.id} className="flex items-center gap-3 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {campaign.candidateName ?? campaign.name}
                    </p>
                    {campaign.candidateTitle && (
                      <p className="text-xs text-gray-400">{campaign.candidateTitle}</p>
                    )}
                  </div>
                  <button
                    onClick={() => requestCampaignSignal(campaign, "general_support")}
                    className="flex-shrink-0 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                  >
                    Support
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask a question */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />Ask a Question
          </h3>
          <div className="flex gap-2">
            <textarea value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
              placeholder={`Ask ${official.name.split(" ")[0]} a question…`}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
              rows={2} />
            <button onClick={askQuestion} disabled={submitting || !newQuestion.trim()}
              className="w-11 flex-shrink-0 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Q&A */}
        {questions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Questions & Answers ({questions.length})</h3>
            {questions.map(q => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button className="w-full text-left px-4 py-3.5 flex items-start gap-3" onClick={() => {
                  setExpanded(prev => {
                    const n = new Set(prev);
                    n.has(q.id) ? n.delete(q.id) : n.add(q.id);
                    return n;
                  });
                }}>
                  <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{q.user.name ?? "Anonymous"} · {q.upvotes} upvotes</p>
                  </div>
                  {q.answer && (
                    expanded.has(q.id)
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {q.answer && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      Answered
                    </span>
                  )}
                </button>
                {q.answer && expanded.has(q.id) && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="bg-blue-50 rounded-xl p-3 mt-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">{official.name} answered:</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{q.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
