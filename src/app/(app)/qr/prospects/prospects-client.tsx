"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Lock,
  MapPin,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  Phone,
  Mail,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Prospect {
  id: string;
  prospectType: string;
  status: string;
  intent: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  signRequested: boolean;
  volunteerInterest: boolean;
  score: number;
  isLocked: boolean;
  unlockEligible: boolean;
  locationCluster: string | null;
  followUpStatus: string;
  createdAt: string;
  qrLabel: string | null;
  qrCode: { label: string | null; type: string; locationName: string | null } | null;
  signOpps: Array<{ id: string; approximateAddress: string | null; status: string }>;
}

interface TeaserStats {
  lockedTotal: number;
  lockedSignRequests: number;
  lockedVolunteerLeads: number;
}

const TYPE_EMOJI: Record<string, string> = {
  supporter: "✊",
  volunteer_lead: "🙋",
  sign_request: "🪧",
  update_subscriber: "📬",
  issue_responder: "🔍",
  event_attendee: "🎟️",
  donor_lead: "💚",
  anonymous_engagement: "👀",
};

const TYPE_LABEL: Record<string, string> = {
  supporter: "Supporter",
  volunteer_lead: "Volunteer Lead",
  sign_request: "Sign Request",
  update_subscriber: "Update Subscriber",
  issue_responder: "Issue Responder",
  event_attendee: "Event Attendee",
  donor_lead: "Donor Lead",
  anonymous_engagement: "Anonymous",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  contacted: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  converted: "bg-green-500/20 text-green-400 border border-green-500/30",
  deferred: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  disqualified: "bg-red-500/20 text-red-400 border border-red-500/30",
  archived: "bg-slate-600/20 text-slate-500 border border-slate-600/30",
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function ProspectsClient({ campaignId }: { campaignId: string }) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [teaserStats, setTeaserStats] = useState<TeaserStats>({ lockedTotal: 0, lockedSignRequests: 0, lockedVolunteerLeads: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [signOnly, setSignOnly] = useState(false);
  const [volunteerOnly, setVolunteerOnly] = useState(false);
  const [lockedFilter, setLockedFilter] = useState("");

  const loadProspects = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ campaignId, limit: "50" });
    if (typeFilter) sp.set("type", typeFilter);
    if (statusFilter) sp.set("status", statusFilter);
    if (signOnly) sp.set("signOnly", "true");
    if (volunteerOnly) sp.set("volunteerOnly", "true");
    if (lockedFilter) sp.set("locked", lockedFilter);

    const res = await fetch(`/api/qr/prospects?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setProspects(data.prospects ?? []);
      setTotal(data.total ?? 0);
      setTeaserStats(data.teaserStats ?? { lockedTotal: 0, lockedSignRequests: 0, lockedVolunteerLeads: 0 });
    }
    setLoading(false);
  }, [campaignId, typeFilter, statusFilter, signOnly, volunteerOnly, lockedFilter]);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  const updateProspectStatus = async (id: string, status: string) => {
    await fetch(`/api/qr/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status }),
    });
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p)),
    );
    if (selectedProspect?.id === id) {
      setSelectedProspect((p) => (p ? { ...p, status } : null));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/qr"
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-[#1D9E75]" />
            QR Prospects
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} total · Physical-to-digital leads</p>
        </div>
      </div>

      {/* Teaser banner */}
      {teaserStats.lockedTotal > 0 && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <Lock className="h-8 w-8 text-amber-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-amber-400 font-bold text-base mb-1">
                {teaserStats.lockedTotal} locked prospects waiting
              </h3>
              <p className="text-slate-300 text-sm mb-3">
                Your QR codes have been quietly capturing leads. These prospects are stored and waiting for you.
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                <span>🪧 {teaserStats.lockedSignRequests} sign requests</span>
                <span>🙋 {teaserStats.lockedVolunteerLeads} volunteer leads</span>
              </div>
              <Link
                href="/billing"
                className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
              >
                <Lock className="h-4 w-4" />
                Upgrade to unlock all prospects
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v} className="bg-slate-900">{l}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
        >
          <option value="">All statuses</option>
          <option value="new" className="bg-slate-900">New</option>
          <option value="contacted" className="bg-slate-900">Contacted</option>
          <option value="converted" className="bg-slate-900">Converted</option>
          <option value="deferred" className="bg-slate-900">Deferred</option>
        </select>

        <button
          onClick={() => setSignOnly(!signOnly)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            signOnly
              ? "bg-amber-500 border-amber-500 text-white"
              : "bg-slate-800/60 border-white/10 text-slate-400 hover:border-white/30"
          }`}
        >
          🪧 Signs only
        </button>

        <button
          onClick={() => setVolunteerOnly(!volunteerOnly)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            volunteerOnly
              ? "bg-purple-500 border-purple-500 text-white"
              : "bg-slate-800/60 border-white/10 text-slate-400 hover:border-white/30"
          }`}
        >
          🙋 Volunteers only
        </button>
      </div>

      <div className="flex gap-5">
        {/* Prospect list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading prospects…</div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/40 border border-white/5 rounded-2xl">
              <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">No prospects yet</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Prospects appear here when people scan your QR codes and engage with the landing page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.map((p) => (
                <motion.button
                  key={p.id}
                  layout
                  onClick={() => setSelectedProspect(p)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    selectedProspect?.id === p.id
                      ? "bg-[#1D9E75]/10 border-[#1D9E75]/40"
                      : "bg-slate-800/40 border-white/5 hover:border-white/10"
                  }`}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-2xl flex-shrink-0">
                    {TYPE_EMOJI[p.prospectType] ?? "👤"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-semibold">
                        {p.isLocked ? "Locked prospect" : (p.name ?? "Anonymous")}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[p.status] ?? STATUS_BADGE.new}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{TYPE_LABEL[p.prospectType] ?? p.prospectType}</span>
                      {p.intent && <span>· {p.intent.replace(/_/g, " ")}</span>}
                      {p.locationCluster && (
                        <span className="flex items-center gap-0.5">
                          · <MapPin className="h-2.5 w-2.5" /> {p.locationCluster}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.signRequested && <span title="Sign requested" className="text-sm">🪧</span>}
                    {p.volunteerInterest && <span title="Volunteer" className="text-sm">🙋</span>}
                    {p.isLocked ? (
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          p.score >= 60
                            ? "bg-green-500/20 text-green-400"
                            : p.score >= 30
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {p.score}
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedProspect && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={spring}
              className="w-80 flex-shrink-0"
            >
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">
                    {selectedProspect.isLocked
                      ? "Locked Prospect"
                      : selectedProspect.name ?? "Anonymous"}
                  </h3>
                  <button
                    onClick={() => setSelectedProspect(null)}
                    className="text-slate-400 hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {selectedProspect.isLocked ? (
                  <div className="text-center py-6">
                    <Lock className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm mb-4">
                      This prospect's details are locked. Upgrade to access their full profile.
                    </p>
                    <Link
                      href="/billing"
                      className="inline-block bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
                    >
                      Unlock →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Contact info */}
                    <div className="space-y-2 mb-4">
                      {selectedProspect.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          {selectedProspect.phone}
                        </div>
                      )}
                      {selectedProspect.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          {selectedProspect.email}
                        </div>
                      )}
                      {selectedProspect.locationCluster && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          {selectedProspect.locationCluster}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                        {TYPE_LABEL[selectedProspect.prospectType] ?? selectedProspect.prospectType}
                      </span>
                      {selectedProspect.intent && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                          {selectedProspect.intent.replace(/_/g, " ")}
                        </span>
                      )}
                      {selectedProspect.signRequested && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                          🪧 Sign requested
                        </span>
                      )}
                      {selectedProspect.volunteerInterest && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                          🙋 Volunteer
                        </span>
                      )}
                    </div>

                    {/* Source */}
                    {selectedProspect.qrCode && (
                      <div className="text-xs text-slate-400 mb-4 px-3 py-2 bg-white/5 rounded-lg">
                        Via {selectedProspect.qrLabel ?? selectedProspect.qrCode.type.replace(/_/g, " ")}
                        {selectedProspect.qrCode.locationName && ` · ${selectedProspect.qrCode.locationName}`}
                      </div>
                    )}

                    {/* Status actions */}
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 uppercase tracking-wider">Update status</div>
                      {["contacted", "converted", "deferred"].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateProspectStatus(selectedProspect.id, s)}
                          disabled={selectedProspect.status === s}
                          className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                            selectedProspect.status === s
                              ? "bg-[#1D9E75]/20 text-[#1D9E75] cursor-default"
                              : "bg-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {selectedProspect.status === s && <CheckCircle className="h-3.5 w-3.5 inline mr-1.5" />}
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
