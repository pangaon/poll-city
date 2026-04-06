"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  slug: string;
  title: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function MarkRecordedModal({ open, slug, title, onClose, onSaved }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [minutes, setMinutes] = useState(4);
  const [seconds, setSeconds] = useState(0);
  const [e2e, setE2e] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [build, setBuild] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!videoUrl.trim() || !e2e || !accurate || !build) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ops/videos/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          thumbnailUrl,
          minutes,
          seconds,
          confirms: { e2e, accurate, build },
        }),
      });
      if (!res.ok) throw new Error("failed");

      fetch("/api/adoni/train", { method: "POST" })
        .then(() => toast.success("Adoni updated with this feature ✅"))
        .catch(() => {});

      toast.success(`✅ ${title} marked as verified`);
      await onSaved();
      onClose();
    } catch {
      toast.error("Could not save video verification");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 p-5 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Mark Video as Recorded — {title}</h3>
        <input
          type="url"
          required
          placeholder="Video URL (Loom, YouTube, or Vimeo)"
          className="w-full border rounded-lg px-3 py-2"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} max={60} className="border rounded-lg px-3 py-2" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          <input type="number" min={0} max={59} className="border rounded-lg px-3 py-2" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
        </div>
        <input
          type="url"
          placeholder="Thumbnail URL (optional)"
          className="w-full border rounded-lg px-3 py-2"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />

        <label className="block text-sm"><input type="checkbox" checked={e2e} onChange={(e) => setE2e(e.target.checked)} className="mr-2" />This video shows the feature end to end with no skipped steps.</label>
        <label className="block text-sm"><input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} className="mr-2" />The article accurately describes feature behavior today.</label>
        <label className="block text-sm"><input type="checkbox" checked={build} onChange={(e) => setBuild(e.target.checked)} className="mr-2" />I ran npm run build and confirmed zero errors.</label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !videoUrl || !e2e || !accurate || !build} className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white disabled:opacity-50">
            Save & Mark Verified ✅
          </button>
        </div>
      </div>
    </div>
  );
}
