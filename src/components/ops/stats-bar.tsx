type Props = {
  stats: {
    total: number;
    verified: number;
    no_video: number;
    needs_update: number;
    not_built: number;
    script_ready: number;
  };
};

export function StatsBar({ stats }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 flex flex-wrap items-center gap-3">
      <span>Total: {stats.total}</span>
      <span>|</span>
      <span>✅ Verified: {stats.verified}</span>
      <span>|</span>
      <span>🟡 Script Ready: {stats.script_ready}</span>
      <span>|</span>
      <span>🔴 No Video: {stats.no_video}</span>
      <span>|</span>
      <span>🟠 Needs Update: {stats.needs_update}</span>
      <span>|</span>
      <span>⬛ Not Built: {stats.not_built}</span>
    </div>
  );
}
