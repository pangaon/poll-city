"use client";
import { useState } from "react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, XCircle, Info, Users, Mail } from "lucide-react";

type ConsentType = "explicit" | "implied" | "express_withdrawal";
type ConsentChannel = "email" | "sms" | "push";
type ConsentSource = "import" | "form" | "qr" | "manual" | "social_follow" | "donation" | "event_signup";

interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  channel: ConsentChannel;
  source: ConsentSource;
  collectedAt: string;
  expiresAt: string | null;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null };
  recordedBy: { id: string; name: string | null } | null;
}

interface Stats {
  totalWithEmail: number;
  consentedCount: number;
  withdrawnCount: number;
  noConsentCount: number;
  coveragePct: number;
}

interface Props {
  campaignId: string;
  stats: Stats;
  recentRecords: ConsentRecord[];
}

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  explicit: "Explicit",
  implied: "Implied",
  express_withdrawal: "Withdrawn",
};

const SOURCE_LABELS: Record<ConsentSource, string> = {
  import: "CSV Import",
  form: "Web Form",
  qr: "QR Capture",
  manual: "Manual Entry",
  social_follow: "Social Follow",
  donation: "Donation",
  event_signup: "Event Sign-up",
};

const CHANNEL_LABELS: Record<ConsentChannel, string> = { email: "Email", sms: "SMS", push: "Push" };

export default function ComplianceClient({ stats, recentRecords }: Props) {
  const [tab, setTab] = useState<"overview" | "history">("overview");

  const coverageColor =
    stats.coveragePct >= 80 ? "text-green-700" : stats.coveragePct >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          CASL Compliance
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Canada&rsquo;s Anti-Spam Legislation (CASL) requires documented consent before sending
          commercial electronic messages. This dashboard shows your current consent coverage.
        </p>
      </div>

      {/* Coverage stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">Total with Email</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalWithEmail.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500 font-medium">Consented</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.consentedCount.toLocaleString()}</p>
          <p className={cn("text-xs font-medium mt-0.5", coverageColor)}>{stats.coveragePct}% coverage</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-gray-500 font-medium">No Consent</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{stats.noConsentCount.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Blocked from email blasts</p>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Withdrawn</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.withdrawnCount.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Permanently opted out</p>
        </div>
      </div>

      {/* How to collect consent */}
      {stats.noConsentCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {stats.noConsentCount.toLocaleString()} contacts cannot receive email blasts
              </p>
              <p className="text-sm text-blue-700 mt-1">How to add consent records:</p>
              <ul className="text-sm text-blue-700 mt-1 space-y-0.5 list-disc list-inside">
                <li>
                  <strong>Import CSV</strong> — map the &ldquo;Consent Given&rdquo; column in Import
                  &amp; Export → Smart Import
                </li>
                <li>
                  <strong>Contact detail</strong> — open any contact → CASL Consent tab → Record consent event
                </li>
                <li>
                  <strong>QR Capture</strong> — consent is implied when a voter completes the QR flow
                </li>
                <li>
                  <strong>Donations</strong> — implied consent auto-recorded on every donation
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {(["overview", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-white border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-gray-900",
              )}
            >
              {t === "overview" ? "Coverage by Channel" : "Recent Events"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">
              Consent is tracked per contact per channel. A contact consented for email is not automatically
              consented for SMS — each channel requires its own record.
            </p>
            <div className="space-y-3">
              {(["email", "sms", "push"] as ConsentChannel[]).map((ch) => (
                <div key={ch} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 w-12">{CHANNEL_LABELS[ch]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        ch === "email" ? "bg-blue-500" : "bg-gray-300",
                      )}
                      style={{ width: ch === "email" ? `${stats.coveragePct}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">
                    {ch === "email" ? `${stats.coveragePct}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              SMS and push consent tracking coming soon — email is the P0 channel for CASL.
            </p>
          </div>
        )}

        {tab === "history" && (
          <div className="p-4">
            {recentRecords.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No consent records yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add consent via the CASL Consent tab on any contact, or map consent columns during import.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentRecords.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/contacts/${rec.contact.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {rec.contact.firstName} {rec.contact.lastName}
                        </Link>
                        <span className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded",
                          rec.consentType === "express_withdrawal"
                            ? "bg-red-100 text-red-700"
                            : rec.consentType === "explicit"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700",
                        )}>
                          {CONSENT_TYPE_LABELS[rec.consentType]}
                        </span>
                        <span className="text-xs text-gray-500">{CHANNEL_LABELS[rec.channel]}</span>
                      </div>
                      {rec.contact.email && (
                        <p className="text-xs text-gray-400 mt-0.5">{rec.contact.email}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(rec.collectedAt)} · via {SOURCE_LABELS[rec.source]}
                        {rec.recordedBy && ` · by ${rec.recordedBy.name ?? "system"}`}
                      </p>
                      {rec.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{rec.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
