import type { VideoStatus } from "@/lib/help-center/types";

const STATUS_BADGES: Record<VideoStatus, { label: string; className: string }> = {
  verified: { label: "✅ Verified", className: "bg-emerald-100 text-emerald-800" },
  no_video: { label: "🔴 No Video", className: "bg-rose-100 text-rose-800" },
  script_ready: { label: "🟡 Script Ready", className: "bg-amber-100 text-amber-800" },
  needs_update: { label: "🟠 Needs Update", className: "bg-orange-100 text-orange-800" },
  not_built: { label: "⬛ Not Built", className: "bg-slate-200 text-slate-700" },
};

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const badge = STATUS_BADGES[status];
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}
