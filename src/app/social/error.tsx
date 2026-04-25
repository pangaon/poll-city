"use client";

import Link from "next/link";

export default function SocialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#080D14] flex items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0F1923] p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#00D4C8]">Poll City Social</p>
        <h1 className="mt-3 text-3xl font-extrabold text-white">Something went wrong</h1>
        <p className="mt-4 text-white/50">
          We hit an unexpected issue. Please try again or return to the feed.
        </p>
        {process.env.NODE_ENV === "development" && error?.message && (
          <pre className="mt-4 text-left text-xs text-red-400 bg-red-950/30 rounded-xl p-4 overflow-auto">
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-full bg-[#00D4C8] px-6 py-3 text-sm font-bold text-[#080D14] transition-colors hover:bg-[#00BFB4]"
          >
            Try Again
          </button>
          <Link
            href="/social"
            className="inline-flex items-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/[0.06]"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    </main>
  );
}
