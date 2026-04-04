"use client";
import { useState, useEffect } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
import { MapPin, Bell, LogOut, Vote, ChevronRight, Shield, X, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ConsentRecord {
  id: string;
  campaign: { id: string; name: string; slug: string };
  signalType: string;
  consentScope: string;
  fieldsShared: string[];
  isActive: boolean;
  revokedAt: string | null;
  createdAt: string;
}

const SIGNAL_LABELS: Record<string, string> = {
  strong_support:     "Strong support",
  general_support:    "General support",
  sign_request:       "Sign request",
  do_not_contact:     "Do not contact",
  volunteer_interest: "Volunteer interest",
  question:           "Question submitted",
};

const SCOPE_LABELS: Record<string, string> = {
  campaign_awareness: "Notified of your support",
  sign_installation:  "May contact you about a sign",
  volunteer_contact:  "May contact you to volunteer",
  do_not_contact:     "Marked as do not contact",
};

// ── Consent section ─────────────────────────────────────────────────────────

function ConsentSection() {
  const [consents, setConsents]       = useState<ConsentRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [revoking, setRevoking]       = useState<string | null>(null); // consentId being revoked
  const [confirmId, setConfirmId]     = useState<string | null>(null); // consentId awaiting confirm
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/consent")
      .then(r => r.json())
      .then(json => {
        setConsents(json.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load consent records.");
        setLoading(false);
      });
  }, []);

  async function revoke(consentId: string) {
    setRevoking(consentId);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/social/consent/${consentId}`, { method: "DELETE" });
      if (res.ok) {
        setConsents(prev =>
          prev.map(c => c.id === consentId ? { ...c, isActive: false, revokedAt: new Date().toISOString() } : c)
        );
      } else {
        setError("Could not revoke consent. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  const active  = consents.filter(c => c.isActive);
  const revoked = consents.filter(c => !c.isActive);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600" />
          <p className="text-sm font-bold text-gray-900">Your Consents</p>
        </div>
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Your Consents</p>
          <p className="text-xs text-gray-400">Data you have shared with campaigns</p>
        </div>
      </div>

      {error && (
        <div className="mx-4 my-3 flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* No active consents */}
      {active.length === 0 && revoked.length === 0 && (
        <div className="px-4 py-6 text-center">
          <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No consents yet.</p>
          <p className="text-xs text-gray-400 mt-1">When you support a campaign, it will appear here.</p>
        </div>
      )}

      {/* Confirm revoke prompt */}
      {confirmId && (
        <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Revoke this consent?</p>
          <p className="text-xs text-amber-700 mb-3">
            The campaign will be notified. They may retain data received before this point.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmId(null)}
              className="flex-1 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => revoke(confirmId)}
              disabled={revoking === confirmId}
              className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {revoking === confirmId ? "Revoking…" : "Yes, revoke"}
            </button>
          </div>
        </div>
      )}

      {/* Active consents */}
      {active.map(c => (
        <div key={c.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.campaign.name}</p>
              <p className="text-xs text-gray-500">{SIGNAL_LABELS[c.signalType] ?? c.signalType}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {SCOPE_LABELS[c.consentScope] ?? c.consentScope}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                {new Date(c.createdAt).toLocaleDateString("en-CA")}
              </p>
            </div>
            <button
              onClick={() => setConfirmId(c.id)}
              disabled={!!revoking}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
              aria-label={`Revoke consent for ${c.campaign.name}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Revoked consents — collapsed by default */}
      {revoked.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Previously revoked
          </p>
          {revoked.map(c => (
            <div key={c.id} className="flex items-center gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 truncate line-through">{c.campaign.name}</p>
                <p className="text-xs text-gray-300">
                  Revoked {new Date(c.revokedAt!).toLocaleDateString("en-CA")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          Revoking consent notifies the campaign. They may retain data shared before revocation
          and are responsible for honouring your request.
        </p>
      </div>
    </div>
  );
}

// ── Profile page ─────────────────────────────────────────────────────────────

export default function SocialProfile() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Profile</h1>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white text-center mb-6">
          <Vote className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h2 className="font-bold text-lg mb-1">Join Poll City</h2>
          <p className="text-blue-200 text-sm mb-4">
            Create an account to follow your reps, track polls, and send support signals.
          </p>
          <button
            onClick={() => signIn()}
            className="bg-white text-blue-700 font-bold px-6 py-2.5 rounded-xl text-sm w-full active:scale-95 transition-all"
          >
            Sign In
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">You can still</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2"><span>✓</span> Browse representatives</div>
            <div className="flex items-center gap-2"><span>✓</span> Participate in public polls</div>
            <div className="flex items-center gap-2"><span>✓</span> View civic information</div>
          </div>
        </div>
      </div>
    );
  }

  const initials = session.user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* User card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-black">
            {initials}
          </div>
          <div>
            <p className="font-bold text-lg">{session.user.name}</p>
            <p className="text-blue-200 text-sm">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {[
          { href: "/social/officials", icon: "👥", label: "My Representatives" },
          { href: "/social/polls",     icon: "📊", label: "Active Polls" },
        ].map(({ href, icon, label }) => (
          <Link
            key={href} href={href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg">{icon}</span>
            <span className="text-sm font-medium text-gray-800 flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Consent list + revoke */}
      <ConsentSection />

      {/* Settings stubs */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 flex-1">Location & riding detection</span>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Bell className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 flex-1">Notifications</span>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/social" })}
        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-2xl border border-red-200 text-sm active:scale-95 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>

      <p className="text-center text-xs text-gray-400">Poll City Social v0.1.0</p>
    </div>
  );
}
