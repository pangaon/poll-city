"use client";

import { useState } from "react";

export function NeedsUpdateButton({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function markNeedsUpdate() {
    if (
      !window.confirm(
        "Mark this video as outdated?\n\nThis will remove the verified status and add it to the retroactive queue.\n\nUse this whenever the feature changes."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/ops/videos/${slug}/needs-update`, { method: "POST" });
      await onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={markNeedsUpdate} disabled={loading} className="text-xs border rounded px-2 py-1 hover:bg-slate-50">
      Needs Update
    </button>
  );
}
