type Row = {
  slug: string;
  feature: string;
  status: string;
  pageViews: number;
};

export function RetroactiveQueue({ rows, onStartRecording }: { rows: Row[]; onStartRecording: (slug: string) => void }) {
  const total = rows.length;
  const done = rows.filter((row) => row.status === "verified").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-amber-900">⚠️ Retroactive videos needed — {total} features</p>
      <p className="text-xs text-amber-800">Priority 1 — Core (most used)</p>
      <div className="space-y-2">
        {rows.slice(0, 8).map((row, index) => (
          <div key={row.slug} className="flex items-center justify-between rounded-lg bg-white border border-amber-200 px-3 py-2 text-sm">
            <span>{index + 1}. 🔴 {row.feature}</span>
            <button className="text-xs border rounded px-2 py-1 hover:bg-slate-50" onClick={() => onStartRecording(row.slug)}>
              Start Recording →
            </button>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-amber-800 mb-1">Progress: {done} / {total} recorded</p>
        <div className="h-2 rounded bg-amber-100 overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
