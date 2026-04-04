"use client";
/**
 * GOTV Engine — Election Day Command Centre
 *
 * Upload the "who has voted" list from the Elections Office.
 * System cross-references your tagged supporters automatically.
 * Strike off voted supporters from call/knock lists in real time.
 * Live dashboard shows % of your vote pulled.
 *
 * Works for: general election, nomination, leadership, union vote, referendum.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, RefreshCw, Users, CheckCircle, Phone, Target, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GotvStats {
  totalSupporters: number;       // contacts tagged as supporter/strong_support
  confirmedVoted: number;        // supporters matched on voted list
  stillNeeded: number;           // supporters not yet voted
  percentagePulled: number;      // confirmedVoted / totalSupporters * 100
  totalVotedInRiding: number;    // everyone on voted list (not just our people)
  unknownVoted: number;          // voted but not in our system
  batches: GotvBatch[];
  recentStrikes: StrikeRecord[];
}

interface GotvBatch {
  id: string;
  name: string;
  uploadedAt: string;
  totalRecords: number;
  matchedCount: number;
  struckCount: number;
}

interface StrikeRecord {
  contactName: string;
  address: string;
  struckAt: string;
  matchScore: number;
}

interface Props {
  campaignId: string;
  electionType?: "general" | "nomination" | "leadership" | "union" | "referendum";
}

export default function GotvEngine({ campaignId, electionType = "general" }: Props) {
  const [stats, setStats] = useState<GotvStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const fileRef = useRef<HTMLInputElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout>();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/gotv?campaignId=${campaignId}`);
      const data = await res.json();
      setStats(data.data);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => {
    load();
    // Auto-refresh every 60 seconds on election day
    refreshInterval.current = setInterval(load, 60000);
    return () => clearInterval(refreshInterval.current);
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("campaignId", campaignId);
      form.append("name", `Upload ${new Date().toLocaleTimeString()}`);

      const res = await fetch("/api/gotv/upload", { method: "POST", body: form });
      const data = await res.json();

      if (res.ok) {
        toast.success(`✅ Struck ${data.data.struckCount} contacts off lists — ${data.data.matchedCount} matches found`);
        load();
      } else {
        toast.error(data.error ?? "Upload failed");
      }
    } finally { setUploading(false); }
  }

  const pullPercent = stats?.percentagePulled ?? 0;
  const pullColor = pullPercent >= 80 ? "text-emerald-600" : pullPercent >= 60 ? "text-blue-600" : pullPercent >= 40 ? "text-amber-600" : "text-red-600";
  const barColor = pullPercent >= 80 ? "bg-emerald-500" : pullPercent >= 60 ? "bg-blue-500" : pullPercent >= 40 ? "bg-amber-500" : "bg-red-500";

  const ELECTION_LABELS: Record<string, string> = {
    general: "Election Day",
    nomination: "Nomination Day",
    leadership: "Leadership Vote",
    union: "Union Vote",
    referendum: "Vote Day",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">{ELECTION_LABELS[electionType]} — GOTV Command</p>
          <button onClick={load} className="text-blue-300 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-blue-300 mb-4">Last updated: {lastRefresh.toLocaleTimeString()}</p>

        {/* Main percentage */}
        <div className="text-center mb-4">
          <p className={cn("text-6xl font-black", pullColor.replace("text-", "text-white/90 "))}>
            {loading ? "—" : `${pullPercent.toFixed(1)}%`}
          </p>
          <p className="text-blue-200 text-sm mt-1">of your supporters have voted</p>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-1000", barColor.replace("bg-", "bg-white/90 "))}
            style={{ width: `${pullPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-blue-300 mt-1">
          <span>0%</span>
          <span className="text-white font-semibold">{stats?.confirmedVoted ?? 0} voted of {stats?.totalSupporters ?? 0}</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Still Need to Vote", value: stats?.stillNeeded ?? 0, icon: <Phone className="w-5 h-5" />, color: "bg-red-50 border-red-200 text-red-700", urgent: true },
          { label: "Confirmed Voted", value: stats?.confirmedVoted ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Total in Riding Voted", value: stats?.totalVotedInRiding ?? 0, icon: <Users className="w-5 h-5" />, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Not In Our System", value: stats?.unknownVoted ?? 0, icon: <AlertCircle className="w-5 h-5" />, color: "bg-gray-50 border-gray-200 text-gray-600" },
        ].map(({ label, value, icon, color, urgent }) => (
          <div key={label} className={cn("rounded-xl border p-3.5 flex items-center gap-3", color)}>
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <p className={cn("text-2xl font-black", urgent && value > 0 ? "animate-pulse" : "")}>{value.toLocaleString()}</p>
              <p className="text-xs font-medium opacity-80 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload voted list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Upload Voted List</h3>
          <span className="text-xs text-gray-400">{stats?.batches?.length ?? 0} uploads today</span>
        </div>
        <div className="p-4">
          <div
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={cn("flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all",
              isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50")}>
            {uploading ? (
              <>
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-blue-600">Processing and striking voters…</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drop Elections Office file</p>
                  <p className="text-xs text-gray-400 mt-0.5">Any format — we match it automatically</p>
                </div>
              </>
            )}
            <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>

          {/* Upload history */}
          {stats?.batches && stats.batches.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {stats.batches.map(batch => (
                <div key={batch.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-600 flex-1">{batch.name}</span>
                  <span className="text-emerald-600 font-semibold">{batch.struckCount} struck</span>
                  <span className="text-gray-400">{new Date(batch.uploadedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent strikes */}
      {stats?.recentStrikes && stats.recentStrikes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Recently Struck Off Lists</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentStrikes.map((strike, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{strike.contactName}</p>
                  <p className="text-xs text-gray-500 truncate">{strike.address}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{new Date(strike.struckAt).toLocaleTimeString()}</p>
                  <p className="text-xs text-emerald-600 font-medium">{strike.matchScore}% match</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority call list - who still needs a call */}
      <PriorityCallList campaignId={campaignId} />
    </div>
  );
}

function PriorityCallList({ campaignId }: { campaignId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gotv/priority-list?campaignId=${campaignId}`)
      .then(r => r.json())
      .then(d => { setContacts(d.data ?? []); setLoading(false); });
  }, [campaignId]);

  if (loading) return <div className="h-24 bg-white rounded-2xl animate-pulse" />;
  if (contacts.length === 0) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
      <p className="font-bold text-emerald-700">All supporters accounted for! 🎉</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">Priority — Still Need to Vote</h3>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{contacts.length}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {contacts.map((c) => (
          <div key={c.id} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{c.address1}</p>
            </div>
            {c.phone && (
              <a href={`tel:${c.phone}`} className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
