"use client";
import Link from "next/link";
import { Users, ThumbsUp, HelpCircle, ThumbsDown, Bell, CheckSquare, Clock, ArrowRight } from "lucide-react";
import { StatCard, Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { formatRelative, fullName } from "@/lib/utils";
import { INTERACTION_TYPE_LABELS } from "@/types";

interface DashboardProps {
  data: {
    totalContacts: number;
    supporters: number;
    undecided: number;
    opposition: number;
    followUpsDue: number;
    notHome: number;
    pendingTasks: number;
    recentActivity: {
      id: string; action: string; entityType: string;
      details: unknown; createdAt: Date;
      user: { name: string | null; email: string | null };
    }[];
    recentInteractions: {
      id: string; type: string; notes: string | null; createdAt: Date;
      contact: { firstName: string; lastName: string };
      user: { name: string | null };
    }[];
  };
  campaign: { name: string; candidateName: string | null; electionDate: Date | null };
  user: { name?: string | null; role: string };
}

function actionLabel(action: string, entityType: string, details: unknown): string {
  const d = details as Record<string, string> | null;
  if (action === "logged_interaction") return `Logged ${d?.type?.replace("_", " ") ?? "interaction"} with ${d?.contactName ?? "contact"}`;
  if (action === "updated_support_level") return `Updated support: ${d?.contactName} → ${d?.to?.replace("_", " ")}`;
  if (action === "created") return `Created ${entityType} "${d?.name ?? ""}"`;
  if (action === "created_task") return `Created task: ${d?.title ?? ""}`;
  return `${action} ${entityType}`;
}

export default function DashboardClient({ data, campaign, user }: DashboardProps) {
  const supportRate = data.totalContacts > 0
    ? Math.round((data.supporters / data.totalContacts) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
      </div>

      {/* Alert: Follow-ups due */}
      {data.followUpsDue > 0 && (
        <Link href="/contacts?followUpNeeded=true" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
          <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {data.followUpsDue} follow-up{data.followUpsDue !== 1 ? "s" : ""} overdue
          </p>
          <ArrowRight className="w-3.5 h-3.5 text-amber-600 ml-auto" />
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="col-span-2 lg:col-span-1 xl:col-span-2">
          <StatCard label="Total Contacts" value={data.totalContacts} icon={<Users className="w-5 h-5" />} color="blue" />
        </div>
        <StatCard label="Supporters" value={data.supporters} icon={<ThumbsUp className="w-5 h-5" />} color="green" />
        <StatCard label="Undecided" value={data.undecided} icon={<HelpCircle className="w-5 h-5" />} color="amber" />
        <StatCard label="Opposition" value={data.opposition} icon={<ThumbsDown className="w-5 h-5" />} color="red" />
        <StatCard label="Follow-ups Due" value={data.followUpsDue} icon={<Bell className="w-5 h-5" />} color="amber" />
        <StatCard label="Not Home" value={data.notHome} icon={<Users className="w-5 h-5" />} color="gray" />
        <StatCard label="Open Tasks" value={data.pendingTasks} icon={<CheckSquare className="w-5 h-5" />} color="purple" />
      </div>

      {/* Support rate bar */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Support Rate</p>
          <span className="text-sm font-bold text-gray-900">{supportRate}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(data.supporters / data.totalContacts) * 100}%` }} />
          <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${(data.undecided / data.totalContacts) * 100}%` }} />
          <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(data.opposition / data.totalContacts) * 100}%` }} />
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: "Support", color: "bg-emerald-500", pct: Math.round((data.supporters / data.totalContacts) * 100) },
            { label: "Undecided", color: "bg-amber-400", pct: Math.round((data.undecided / data.totalContacts) * 100) },
            { label: "Opposition", color: "bg-red-400", pct: Math.round((data.opposition / data.totalContacts) * 100) },
          ].map(({ label, color, pct }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{label} {pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Two-column bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent interactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Interactions</h3>
              <Link href="/contacts" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentInteractions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No interactions yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentInteractions.map((i) => (
                  <div key={i.id} className="px-6 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {fullName(i.contact.firstName, i.contact.lastName)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {INTERACTION_TYPE_LABELS[i.type as keyof typeof INTERACTION_TYPE_LABELS]} · {i.user.name ?? "Unknown"}
                      </p>
                      {i.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{i.notes}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(i.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Activity Log</h3>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentActivity.map((log) => (
                  <div key={log.id} className="px-6 py-3">
                    <p className="text-sm text-gray-800">{actionLabel(log.action, log.entityType, log.details)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{log.user.name ?? log.user.email} · {formatRelative(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
