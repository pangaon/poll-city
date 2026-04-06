"use client";

import { useState } from "react";

export function FeedbackWidget({ slug }: { slug: string }) {
  const [submitted, setSubmitted] = useState(false);

  async function submit(helpful: boolean) {
    if (submitted) return;
    await fetch(`/api/help/articles/${slug}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful }),
    });
    setSubmitted(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <p className="text-sm font-semibold text-slate-900 mb-2">Was this helpful?</p>
      {submitted ? (
        <p className="text-sm text-emerald-700">Thanks for the feedback!</p>
      ) : (
        <div className="flex gap-2">
          <button type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50" onClick={() => submit(true)}>
            👍 Yes
          </button>
          <button type="button" className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50" onClick={() => submit(false)}>
            👎 No
          </button>
        </div>
      )}
    </div>
  );
}
