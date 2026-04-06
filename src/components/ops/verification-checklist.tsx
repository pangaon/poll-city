"use client";

import { useMemo } from "react";

type Checklist = {
  apiRouteExists: boolean;
  buildPasses: boolean;
  noTypeScriptErrors: boolean;
  emptyStateExists: boolean;
  loadingStateExists: boolean;
  errorStateExists: boolean;
  mobileWorks: boolean;
  dataIsReal: boolean;
  securityApplied: boolean;
  auditLogExists: boolean;
  helpArticlePublished: boolean;
  videoRecorded: boolean;
  adoniTrained: boolean;
};

const LABELS: Record<keyof Checklist, string> = {
  apiRouteExists: "API route exists",
  buildPasses: "Build passes",
  noTypeScriptErrors: "No TypeScript errors",
  emptyStateExists: "Empty state exists",
  loadingStateExists: "Loading state exists",
  errorStateExists: "Error state exists",
  mobileWorks: "Mobile works",
  dataIsReal: "Data is real",
  securityApplied: "Security applied",
  auditLogExists: "Audit log exists",
  helpArticlePublished: "Help article published",
  videoRecorded: "Video recorded",
  adoniTrained: "Adoni trained",
};

export function VerificationChecklist({
  checklist,
  onToggle,
  onMarkComplete,
}: {
  checklist: Checklist;
  onToggle: (key: keyof Checklist, value: boolean) => void;
  onMarkComplete: () => Promise<void>;
}) {
  const canMarkComplete = useMemo(
    () => checklist.buildPasses && checklist.helpArticlePublished && checklist.videoRecorded && checklist.adoniTrained,
    [checklist]
  );

  return (
    <div className="space-y-4">
      {Object.entries(checklist).map(([key, value]) => (
        <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-white">
          <span className="text-sm text-slate-700">{LABELS[key as keyof Checklist]}</span>
          <input type="checkbox" checked={value} onChange={(e) => onToggle(key as keyof Checklist, e.target.checked)} />
        </label>
      ))}

      <button
        type="button"
        onClick={onMarkComplete}
        disabled={!canMarkComplete}
        title={!canMarkComplete ? "Video required before marking complete" : ""}
        className={
          canMarkComplete
            ? "bg-green-600 text-white cursor-pointer px-6 py-2 rounded-lg"
            : "bg-gray-200 text-gray-400 cursor-not-allowed px-6 py-2 rounded-lg"
        }
      >
        {canMarkComplete ? "Mark Complete ✅" : "🎬 Record video first"}
      </button>
    </div>
  );
}
