"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Globe, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui";

interface Page {
  id: string; title: string; slug: string; summary: string | null;
  publishStatus: string; publishedAt: string | null; createdAt: string;
  issue: { id: string; title: string } | null;
}

interface Props { campaignId: string; }

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

export default function ResponsePagesClient({ campaignId }: Props) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reputation/pages?campaignId=${campaignId}`);
    if (res.ok) setPages(await res.json().then((d) => d.pages));
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const filtered = pages.filter((p) =>
    !filter || p.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Response Pages
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Fact sheets, rebuttals, and public statements</p>
          </div>
          <Button size="sm" style={{ background: NAVY }} className="gap-1"
            onClick={() => router.push(`/reputation/pages/new?campaignId=${campaignId}`)}>
            <Plus className="w-3.5 h-3.5" /> New Page
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 max-w-4xl mx-auto">
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md w-full focus:outline-none"
            placeholder="Search pages…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No response pages yet</p>
            <p className="text-sm mt-1">Create a fact sheet or rebuttal to address issues publicly</p>
            <Button size="sm" className="mt-4" style={{ background: NAVY }}
              onClick={() => router.push(`/reputation/pages/new?campaignId=${campaignId}`)}>
              Create First Page
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((page) => (
              <motion.div key={page.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${page.publishStatus === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {page.publishStatus}
                    </span>
                    {page.issue && (
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Issue: {page.issue.title}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{page.title}</h3>
                  {page.summary && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{page.summary}</p>}
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> /{page.slug}
                  </p>
                </div>
                <Button variant="outline" size="sm"
                  onClick={() => router.push(`/reputation/pages/${page.id}?campaignId=${campaignId}`)}>
                  Edit
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
