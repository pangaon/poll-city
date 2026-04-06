"use client";

import { useEffect, useState } from "react";
import { StatsBar } from "@/components/ops/stats-bar";
import { VideoStatusBadge } from "@/components/ops/video-status-badge";
import { ScriptViewer } from "@/components/ops/script-viewer";
import { MarkRecordedModal } from "@/components/ops/mark-recorded-modal";
import { NeedsUpdateButton } from "@/components/ops/needs-update-flow";
import { RetroactiveQueue } from "@/components/ops/retroactive-queue";

type VideoRow = {
  slug: string;
  feature: string;
  category: string;
  status: "verified" | "no_video" | "script_ready" | "needs_update" | "not_built";
  lastVerified: string | null;
  videoUrl: string | null;
  pageViews: number;
  script?: { title: string; duration: string; script: string; voiceNotes: string | null };
};

type OpsPayload = {
  data: VideoRow[];
  stats: { total: number; verified: number; no_video: number; needs_update: number; script_ready: number; not_built: number };
  retroactiveQueue: VideoRow[];
};

export default function OpsVideosPage() {
  const [payload, setPayload] = useState<OpsPayload | null>(null);
  const [scriptSlug, setScriptSlug] = useState<string | null>(null);
  const [recordSlug, setRecordSlug] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/ops/videos");
    const data = await res.json();
    setPayload(data as OpsPayload);
  }

  useEffect(() => {
    load();
  }, []);

  if (!payload) return <div className="p-4 text-sm text-slate-600">Loading video operations...</div>;

  const selectedScript = payload.data.find((row) => row.slug === scriptSlug);
  const selectedRecord = payload.data.find((row) => row.slug === recordSlug);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Videos & Docs</h1>
      <StatsBar stats={payload.stats} />

      {payload.stats.no_video > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          ⚠️ {payload.stats.no_video} features are marked complete but have no video. These do not count as truly done. Start recording.
        </div>
      )}

      <RetroactiveQueue rows={payload.retroactiveQueue} onStartRecording={(slug) => setScriptSlug(slug)} />

      <div className="rounded-xl border border-slate-200 bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">Feature</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last Verified</th>
              <th className="px-3 py-2 text-left">Video</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payload.data.map((row) => (
              <tr key={row.slug} className="border-t align-top">
                <td className="px-3 py-2">{row.feature}</td>
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2"><VideoStatusBadge status={row.status} /></td>
                <td className="px-3 py-2">{row.lastVerified ? new Date(row.lastVerified).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2">{row.videoUrl ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button className="text-xs border rounded px-2 py-1" onClick={() => setScriptSlug(row.slug)}>View Script</button>
                    <button className="text-xs border rounded px-2 py-1" onClick={() => setRecordSlug(row.slug)}>Mark Recorded</button>
                    <NeedsUpdateButton slug={row.slug} onDone={load} />
                    <button
                      className="text-xs border rounded px-2 py-1"
                      onClick={async () => {
                        await fetch(`/api/ops/videos/${row.slug}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ clearVideo: true }),
                        });
                        await load();
                      }}
                    >
                      Delete Video
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ScriptViewer
        open={!!selectedScript}
        title={selectedScript?.script?.title || selectedScript?.feature || "Script"}
        duration={selectedScript?.script?.duration || "04:00"}
        script={selectedScript?.script?.script || ""}
        voiceNotes={selectedScript?.script?.voiceNotes || null}
        onClose={() => setScriptSlug(null)}
        onDoneRecording={() => {
          if (selectedScript) setRecordSlug(selectedScript.slug);
          setScriptSlug(null);
        }}
      />

      <MarkRecordedModal
        open={!!selectedRecord}
        slug={selectedRecord?.slug || ""}
        title={selectedRecord?.feature || "Feature"}
        onClose={() => setRecordSlug(null)}
        onSaved={load}
      />
    </div>
  );
}
