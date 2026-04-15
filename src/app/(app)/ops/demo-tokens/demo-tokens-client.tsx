"use client";

import { useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import {
  Plus, Copy, Check, ExternalLink, Loader2, Trash2,
  Eye, Calendar, User, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

const DEMO_TYPES = [
  { value: "candidate", label: "Candidate", desc: "Ward 20 Toronto municipal campaign" },
  { value: "party",     label: "Party",     desc: "Ontario provincial multi-riding" },
  { value: "media",     label: "Media",     desc: "Election night results + live ticker" },
];

export interface DemoTokenRow {
  id: string;
  token: string;
  type: string;
  prospectName: string | null;
  prospectEmail: string | null;
  views: number;
  lastViewedAt: string | null;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

interface Props {
  tokens: DemoTokenRow[];
}

function demoLink(type: string, token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/demo/${type}?token=${token}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DemoTokensClient({ tokens: initialTokens }: Props) {
  const [tokens, setTokens] = useState<DemoTokenRow[]>(initialTokens);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState("candidate");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);

  function copyLink(token: DemoTokenRow) {
    const link = demoLink(token.type, token.token);
    navigator.clipboard.writeText(link);
    setCopied(token.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/ops/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          prospectName: prospectName.trim() || null,
          prospectEmail: prospectEmail.trim() || null,
          expiresInHours: expiryDays * 24,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to create token");
        return;
      }
      const { data } = await res.json();
      const newRow: DemoTokenRow = {
        id: data.id,
        token: data.token,
        type: data.type,
        prospectName: data.prospectName,
        prospectEmail: data.prospectEmail,
        views: data.views,
        lastViewedAt: data.lastViewedAt,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        expired: new Date(data.expiresAt) < new Date(),
      };
      setTokens((prev) => [newRow, ...prev]);
      setProspectName("");
      setProspectEmail("");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this demo token? The link will stop working immediately.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/ops/demos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to delete token");
        return;
      }
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const activeCount = tokens.filter((t) => !t.expired).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Tokens"
        description="Generate shareable demo links for prospects. No login required."
        actions={
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ background: NAVY }}
          >
            {activeCount} active
          </span>
        }
      />

      {/* Generator */}
      <Card className="p-5">
        <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" style={{ color: NAVY }} />
          Generate New Demo Link
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Demo Type
            </label>
            <div className="space-y-1.5">
              {DEMO_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setType(dt.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg border text-sm transition-all",
                    type === dt.value
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  )}
                >
                  <span className="font-semibold block">{dt.label}</span>
                  <span className="text-[11px] text-gray-500">{dt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prospect fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Prospect Name
              </label>
              <input
                type="text"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Prospect Email
              </label>
              <input
                type="email"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
                placeholder="prospect@example.com"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Expiry + submit */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Expires In (Days)
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>{d} day{d !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full h-10 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: NAVY }}
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Plus className="w-4 h-4" /> Generate Link</>
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex flex-col justify-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Link Preview</p>
            <p className="text-xs font-mono text-gray-600 break-all">
              /demo/<span className="text-blue-600">{type}</span>?token=<span className="text-green-600">xxxxxx</span>
            </p>
            {prospectName && (
              <p className="text-[11px] text-gray-500 mt-2">
                Personalised for: <strong>{prospectName}</strong>
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Token list */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Prospect</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Views</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    No demo tokens yet. Generate one above.
                  </td>
                </tr>
              )}
              {tokens.map((t) => (
                <tr key={t.id} className={cn("transition-colors hover:bg-gray-50", t.expired && "opacity-60")}>
                  {/* Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black text-white uppercase"
                        style={{ background: NAVY }}
                      >
                        {t.type.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900 capitalize">{t.type}</span>
                    </div>
                  </td>

                  {/* Prospect */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {t.prospectName && (
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <User className="w-3 h-3 text-gray-400" />
                          {t.prospectName}
                        </div>
                      )}
                      {t.prospectEmail && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="w-3 h-3" />
                          {t.prospectEmail}
                        </div>
                      )}
                      {!t.prospectName && !t.prospectEmail && (
                        <span className="text-xs text-gray-400">No prospect info</span>
                      )}
                    </div>
                  </td>

                  {/* Views */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                      {t.views}
                    </div>
                    {t.lastViewedAt && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Last: {formatDate(t.lastViewedAt)}
                      </p>
                    )}
                  </td>

                  {/* Expires */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(t.expiresAt)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {t.expired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Expired
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${GREEN}1a`, color: GREEN }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyLink(t)}
                        title="Copy demo link"
                        className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        {copied === t.id
                          ? <Check className="w-3.5 h-3.5 text-green-600" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`/demo/${t.type}?token=${t.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open demo"
                        className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        title="Revoke this demo token — it will no longer grant access"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {deleting === t.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
