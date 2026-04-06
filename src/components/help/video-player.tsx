"use client";

import { useMemo, useState } from "react";

type Props = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  title: string;
};

function parseEmbed(url: string) {
  if (url.includes("loom.com/share/")) {
    const id = url.split("loom.com/share/")[1]?.split(/[?&#]/)[0];
    if (id) return { kind: "iframe" as const, src: `https://www.loom.com/embed/${id}` };
  }
  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("v=")[1]?.split("&")[0];
    if (id) return { kind: "iframe" as const, src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split(/[?&#]/)[0];
    if (id) return { kind: "iframe" as const, src: `https://www.youtube.com/embed/${id}` };
  }
  if (url.includes("vimeo.com/")) {
    const id = url.split("vimeo.com/")[1]?.split(/[?&#]/)[0];
    if (id) return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${id}` };
  }
  return { kind: "video" as const, src: url };
}

export function VideoPlayer({ videoUrl, thumbnailUrl, duration, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const embed = useMemo(() => (videoUrl ? parseEmbed(videoUrl) : null), [videoUrl]);

  if (!videoUrl || !embed) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-100 p-10 text-center text-slate-600">
        Video is not available yet for this article.
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        className="relative w-full cursor-pointer rounded-xl overflow-hidden bg-slate-900 text-left"
        onClick={() => setPlaying(true)}
        style={{ aspectRatio: "16 / 9" }}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {duration && <div className="absolute bottom-3 right-3 bg-black/75 text-white text-sm px-2 py-1 rounded">{duration}</div>}
        <div className="absolute top-3 left-3 bg-black/75 text-white text-sm px-2 py-1 rounded">▶ Watch how-to video</div>
      </button>
    );
  }

  if (embed.kind === "iframe") {
    return (
      <div className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={`${embed.src}${embed.src.includes("?") ? "&" : "?"}autoplay=1`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <video controls autoPlay className="w-full rounded-xl border border-slate-200" style={{ aspectRatio: "16 / 9" }}>
      <source src={embed.src} />
    </video>
  );
}
