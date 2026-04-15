"use client";

import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";

// ─── DROP YOUR FIGMA MAKE URL HERE ───────────────────────────────────────────
// Paste the full URL of your Figma Make prototype (e.g. https://xxx.figma.site)
// Or set NEXT_PUBLIC_FIGMA_APP_URL in your Vercel environment variables.
const FIGMA_APP_URL =
  process.env.NEXT_PUBLIC_FIGMA_APP_URL ?? "";
// ─────────────────────────────────────────────────────────────────────────────

export default function PcAppClient() {
  if (!FIGMA_APP_URL) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <ExternalLink className="w-6 h-6 text-blue-400" />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Figma Prototype URL Not Set</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Open{" "}
            <code className="text-blue-400 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">
              src/app/pcapp/pcapp-client.tsx
            </code>{" "}
            and paste your Figma Make URL into{" "}
            <code className="text-blue-400 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">
              FIGMA_APP_URL
            </code>
            , or set{" "}
            <code className="text-blue-400 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">
              NEXT_PUBLIC_FIGMA_APP_URL
            </code>{" "}
            in Vercel environment variables.
          </p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Poll City
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950">
      {/* Thin header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Poll City
          </Link>
          <span className="text-slate-700">·</span>
          <span className="text-xs font-semibold text-slate-300">
            Figma Prototype
          </span>
        </div>
        <a
          href={FIGMA_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Open full screen
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Full-screen iframe */}
      <iframe
        src={FIGMA_APP_URL}
        className="flex-1 w-full border-0"
        allow="fullscreen"
        title="Poll City Figma Prototype"
      />
    </div>
  );
}
