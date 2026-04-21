"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CommunicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Communications] Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-red-400">Communications failed to load</h1>
        <p className="text-slate-400 text-sm">
          An error occurred rendering this page. Error details below help diagnose the cause.
        </p>
        {error.message && (
          <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-amber-300 overflow-auto whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        {error.digest && (
          <p className="text-slate-600 text-xs">Digest: {error.digest}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-md transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
