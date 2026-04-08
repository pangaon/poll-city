"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, FileText } from "lucide-react";
import { PageHeader, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ContentRow {
  id: string;
  sourceName: string;
  sourceGeography: string;
  headline: string;
  sourceUrl: string;
  extractedPoll: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

interface Props {
  pendingCount: number;
  initialItems: ContentRow[];
}

function relevanceColor(score: number): string {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.6) return "text-amber-500";
  return "text-red-500";
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export default function ContentReviewClient({ pendingCount, initialItems }: Props) {
  const [items, setItems] = useState<ContentRow[]>(initialItems);
  const [loading, setLoading] = useState<Record<string, "approve" | "reject" | null>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingTotal, setPendingTotal] = useState(pendingCount);

  async function handleAction(id: string, action: "approve" | "reject") {
    setLoading((prev) => ({ ...prev, [id]: action }));
    try {
      const res = await fetch(`/api/autonomous/review/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(data.error ?? "Failed to process action.");
        return;
      }
      // Remove row
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPendingTotal((prev) => Math.max(0, prev - 1));
    } catch {
      alert("Network error — try again.");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: null }));
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Content Review"
        description="Review AI-extracted civic poll questions before they go live."
        actions={
          pendingTotal > 0 ? (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 border border-amber-200">
              {pendingTotal} pending
            </span>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <FileText className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-slate-500">No content pending review.</p>
          <p className="text-sm mt-1">New items will appear here as sources are ingested.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Headline</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Extracted Question</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-48">Topics</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const poll = item.extractedPoll;
                const question = typeof poll?.question === "string" ? poll.question : null;
                const score = typeof poll?.relevanceScore === "number" ? poll.relevanceScore : 0;
                const tags = Array.isArray(poll?.topicTags) ? (poll.topicTags as string[]) : [];
                const isExpanded = expandedId === item.id;
                const isActing = loading[item.id];

                return (
                  <>
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700 text-xs leading-tight">
                          {item.sourceName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.sourceGeography}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{truncate(item.headline, 60)}</div>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-0.5"
                        >
                          View source <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600 italic">
                          {question ? truncate(question, 80) : <span className="text-slate-400">No question extracted</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-semibold tabular-nums", relevanceColor(score))}>
                          {score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 border border-slate-200"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 4 && (
                            <span className="text-[10px] text-slate-400">+{tags.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={!!isActing}
                            onClick={() => handleAction(item.id, "approve")}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                              isActing === "approve"
                                ? "bg-emerald-100 text-emerald-500 cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isActing === "approve" ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={!!isActing}
                            onClick={() => handleAction(item.id, "reject")}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                              isActing === "reject"
                                ? "bg-red-100 text-red-400 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-500 text-white"
                            )}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {isActing === "reject" ? "…" : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-expanded`} className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2 text-sm">
                            {question && (
                              <div>
                                <span className="font-semibold text-slate-600">Full question: </span>
                                <span className="text-slate-700">{question}</span>
                              </div>
                            )}
                            {poll?.pollType != null && (
                              <div>
                                <span className="font-semibold text-slate-600">Poll type: </span>
                                <span className="text-slate-700">{String(poll.pollType)}</span>
                              </div>
                            )}
                            {Array.isArray(poll?.options) && (poll.options as string[]).length > 0 && (
                              <div>
                                <span className="font-semibold text-slate-600">Options: </span>
                                <span className="text-slate-700">{(poll.options as string[]).join(" / ")}</span>
                              </div>
                            )}
                            {poll?.targetRegion != null && (
                              <div>
                                <span className="font-semibold text-slate-600">Region: </span>
                                <span className="text-slate-700">{String(poll.targetRegion)}</span>
                              </div>
                            )}
                            {poll?.requiresReview === true && (
                              <Badge variant="warning">Flagged for review — politically sensitive or low confidence</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
