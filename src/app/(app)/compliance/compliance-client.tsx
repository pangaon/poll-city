"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ConsentType = "explicit" | "implied" | "express_withdrawal";
type ConsentChannel = "email" | "sms" | "push";
type ConsentSource = "import" | "form" | "qr" | "manual" | "social_follow" | "donation" | "event_signup";
type ConsentStatus = "active" | "revoked";

interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  channel: ConsentChannel;
  source: ConsentSource;
  status: ConsentStatus;
  collectedAt: string;
  expiresAt: string | null;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null };
  recordedBy: { id: string; name: string | null } | null;
}

interface Props {
  campaignId: string;
  stats: { activeConsents: number; explicitCount: number; revokedCount: number; thisWeek: number };
  trendData: { date: string; consents: number }[];
  sourceBreakdown: { source: string; count: number; pct: number }[];
  recentRecords: ConsentRecord[];
}

const SOURCE_LABELS: Record<ConsentSource, string> = {
  import:        "CSV Import",
  form:          "Web Form",
  qr:            "QR Capture",
  manual:        "Manual Entry",
  social_follow: "Social Consent Bridge",
  donation:      "Donation Flow",
  event_signup:  "Event Sign-up",
};

const CARD = "bg-[#0F1440]/60 backdrop-blur-md rounded-xl border border-[#2979FF]/20 shadow-xl";

const SBadge = ({ type }: { type: string }) => {
  const map: Record<string, { label: string; c: string; bg: string }> = {
    active:              { label: "Active",    c: "#00C853", bg: "rgba(0,200,83,0.15)"    },
    revoked:             { label: "Revoked",   c: "#FF3B30", bg: "rgba(255,59,48,0.15)"   },
    explicit:            { label: "Explicit",  c: "#00C853", bg: "rgba(0,200,83,0.15)"    },
    implied:             { label: "Implied",   c: "#EF9F27", bg: "rgba(239,159,39,0.15)"  },
    express_withdrawal:  { label: "Withdrawn", c: "#FF3B30", bg: "rgba(255,59,48,0.15)"   },
    email:               { label: "Email",     c: "#2979FF", bg: "rgba(41,121,255,0.15)"  },
    sms:                 { label: "SMS",       c: "#00C853", bg: "rgba(0,200,83,0.15)"    },
    push:                { label: "Push",      c: "#EF9F27", bg: "rgba(239,159,39,0.15)"  },
  };
  const s = map[type] ?? { label: type, c: "#AAB2FF", bg: "rgba(170,178,255,0.15)" };
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color: s.c, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
};

export default function ComplianceClient({ stats, trendData, sourceBreakdown, recentRecords }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");

  const filtered = recentRecords.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  const kpis = [
    { label: "Active Consents", value: stats.activeConsents, sub: "Can be contacted",      color: "#00C853" },
    { label: "Explicit",        value: stats.explicitCount,  sub: "Highest legal basis",   color: "#2979FF" },
    { label: "Revoked",         value: stats.revokedCount,   sub: "Blocked from all sends", color: "#FF3B30" },
    { label: "This Week",       value: stats.thisWeek,       sub: "New consents collected", color: "#EF9F27" },
  ];

  return (
    <div className="min-h-full bg-[#050A1F] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#F5F7FF] uppercase tracking-tight drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]">
            CASL Compliance
          </h1>
          <p className="text-[#AAB2FF] text-sm mt-1 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#00C853]" />
            Consent Management · Canada&rsquo;s Anti-Spam Law
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2979FF]/30 text-[#AAB2FF] text-xs font-bold uppercase tracking-wider hover:text-[#00E5FF] transition-all">
          <Download size={14} /> Export Consent Ledger
        </button>
      </div>

      {/* CASL Warning Banner */}
      <div className="bg-[#EF9F27]/5 border border-[#EF9F27]/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#EF9F27] flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-black text-[#EF9F27] uppercase tracking-wider mb-1">Legal Requirement</div>
          <p className="text-xs text-[#AAB2FF]">
            Under CASL, every promotional or campaign communication requires explicit, specific, revocable consent
            logged with timestamp and consent source. The Social Consent Bridge is the{" "}
            <strong className="text-[#F5F7FF]">only</strong> authorized path from Poll City Social data into this CRM.
            Never send bulk email to cold lists without consent records on file.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, color }) => (
          <div key={label} className={cn(CARD, "p-5 relative overflow-hidden")}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-20" style={{ backgroundColor: color }} />
            <div className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest mb-2">{label}</div>
            <div className="text-2xl font-black text-[#F5F7FF]" style={{ textShadow: `0 0 10px ${color}60` }}>
              {value.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#6B72A0] mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn(CARD, "lg:col-span-2 p-5")}>
          <h2 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-widest mb-4">
            Consent Collection — Last 7 Days
          </h2>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00C853" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00C853" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#6B72A0", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B72A0", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#050A1F", border: "1px solid #00C853", borderRadius: "6px", color: "#F5F7FF", fontSize: 12 }}
                  formatter={(v) => [Number(v), "Consents"]}
                />
                <Area type="monotone" dataKey="consents" stroke="#00C853" strokeWidth={2} fill="url(#cg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn(CARD, "p-5")}>
          <h2 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-widest mb-4">Sources</h2>
          <div className="space-y-3">
            {sourceBreakdown.length === 0 ? (
              <p className="text-[11px] text-[#6B72A0]">No consent records yet.</p>
            ) : (
              sourceBreakdown.map((s) => (
                <div key={s.source}>
                  <div className="flex justify-between text-[10px] text-[#AAB2FF] mb-1">
                    <span>{SOURCE_LABELS[s.source as ConsentSource] ?? s.source}</span>
                    <span className="font-bold text-[#F5F7FF]">{s.count}</span>
                  </div>
                  <div className="w-full bg-[#050A1F] h-1 rounded-full overflow-hidden border border-[#2979FF]/10">
                    <div className="h-full rounded-full bg-[#00C853]" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className={CARD}>
        <div className="p-4 border-b border-[#2979FF]/20 flex gap-1">
          {(["all", "active", "revoked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
                statusFilter === s
                  ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40"
                  : "text-[#6B72A0] hover:text-[#AAB2FF]",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck className="w-10 h-10 text-[#2979FF]/30 mx-auto mb-3" />
            <p className="text-sm text-[#AAB2FF] font-medium">No consent records yet</p>
            <p className="text-xs text-[#6B72A0] mt-1 max-w-xs mx-auto">
              Add consent via the CASL tab on any contact, map consent columns during CSV import,
              or collect via QR Capture or donation flow.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2979FF]/10">
                  {["Contact", "Channel", "Type", "Source", "Granted", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#6B72A0] uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2979FF]/10">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#2979FF]/5 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${r.contact.id}`}>
                        <div className="font-bold text-[#F5F7FF] text-sm group-hover:text-[#00E5FF] transition-colors">
                          {r.contact.firstName} {r.contact.lastName}
                        </div>
                        {r.contact.email && (
                          <div className="text-[10px] text-[#6B72A0]">{r.contact.email}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><SBadge type={r.channel} /></td>
                    <td className="px-4 py-3"><SBadge type={r.consentType} /></td>
                    <td className="px-4 py-3 text-xs text-[#AAB2FF] max-w-[160px] truncate">
                      {SOURCE_LABELS[r.source] ?? r.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B72A0] whitespace-nowrap">
                      {new Date(r.collectedAt).toLocaleDateString("en-CA")}
                    </td>
                    <td className="px-4 py-3"><SBadge type={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
