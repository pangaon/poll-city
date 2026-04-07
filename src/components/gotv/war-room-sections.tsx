import { type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { formatAddress, PriorityContact, SummaryResponse, supportLabel } from "./war-room-types";

export function WarRoomHero({
  summary,
  progress,
  refreshing,
  onRefresh,
}: {
  summary: SummaryResponse | null;
  progress: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-red-900 to-orange-800 p-5 text-white">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-red-100">Election Day Command</p>
          <h1 className="text-2xl font-black md:text-3xl">The Gap</h1>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-70"
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-black/20 p-4">
          <p className="text-xs uppercase text-red-200">Supporters Voted</p>
          <p className="mt-2 text-3xl font-black">{summary?.supportersVoted.toLocaleString() ?? 0}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-4">
          <p className="text-xs uppercase text-red-200">Still Needed (Gap)</p>
          <p className="mt-2 text-3xl font-black">{summary?.gap.toLocaleString() ?? 0}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-4">
          <p className="text-xs uppercase text-red-200">Progress</p>
          <p className="mt-2 text-3xl font-black">{progress}%</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </section>
  );
}

export function MockBanner({ mockReasons }: { mockReasons: string[] }) {
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
        <div>
          <p className="text-sm font-bold text-amber-900">MOCK DATA ACTIVE</p>
          <p className="text-xs text-amber-800">
            Backend routes are not fully live. This board is running with fallback sample data for unavailable endpoints.
          </p>
          {mockReasons.length > 0 && (
            <p className="mt-1 text-xs text-amber-800">{mockReasons.join(" | ")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function SummaryTiles({ summary }: { summary: SummaryResponse | null }) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricTile label="Confirmed Supporters" value={summary?.confirmedSupporters ?? 0} icon={<Users className="h-4 w-4" />} />
      <MetricTile label="Voted Today" value={summary?.votedToday ?? 0} icon={<Clock3 className="h-4 w-4" />} />
      <MetricTile label="Win Threshold" value={summary?.winThreshold ?? 0} icon={<AlertTriangle className="h-4 w-4" />} />
      <MetricTile label="Total Turnout" value={summary?.totalVoted ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
    </section>
  );
}

export function PriorityStrikeList({
  contacts,
  busyContactId,
  onMarkVoted,
  onStrikeOff,
}: {
  contacts: PriorityContact[];
  busyContactId: string | null;
  onMarkVoted: (contactId: string) => void;
  onStrikeOff: (contactId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">Priority Strike List</h2>
        <p className="text-xs text-slate-500">GET /api/gotv/priority-list with action posts to /mark-voted and /strike-off</p>
      </div>

      {contacts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-700">No remaining supporters in queue.</p>
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto">
          {contacts.map((contact) => (
            <div key={contact.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-slate-500">{formatAddress(contact)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{supportLabel(contact.supportLevel)} supporter</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={contact.phone ? `tel:${contact.phone}` : undefined}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {contact.phone ? `Call ${contact.phone}` : "No Phone"}
                  </a>
                  <button
                    type="button"
                    disabled={busyContactId === contact.id}
                    onClick={() => onMarkVoted(contact.id)}
                    className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-70"
                  >
                    Mark Voted
                  </button>
                  <button
                    type="button"
                    disabled={busyContactId === contact.id}
                    onClick={() => onStrikeOff(contact.id)}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
                  >
                    Strike Off
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricTile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">{icon}{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}
