"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Download,
  QrCode,
  BarChart2,
  Users,
  MapPin,
  Clock,
  ExternalLink,
  Eye,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface QrCodeDetail {
  id: string;
  token: string;
  type: string;
  funnelType: string;
  placementType: string | null;
  label: string | null;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  status: string;
  teaserMode: boolean;
  scanCount: number;
  prospectCount: number;
  signOpportunityCount: number;
  publicUrl: string;
  qrImageUrl: string;
  startAt: string | null;
  endAt: string | null;
  landingConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Scan {
  id: string;
  intent: string | null;
  conversionStage: string;
  deviceClass: string | null;
  isRepeat: boolean;
  capturedName: string | null;
  capturedPhone: string | null;
  createdAt: string;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const STAGE_COLORS: Record<string, string> = {
  landed: "bg-slate-500/30 text-slate-300",
  engaged: "bg-blue-500/30 text-blue-300",
  intent_set: "bg-amber-500/30 text-amber-300",
  info_captured: "bg-purple-500/30 text-purple-300",
  converted: "bg-green-500/30 text-green-300",
  followed_up: "bg-teal-500/30 text-teal-300",
};

export default function QrDetailClient({
  qrCode,
  campaignId,
}: {
  qrCode: QrCodeDetail;
  campaignId: string;
}) {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [copied, setCopied] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const loadScans = useCallback(async () => {
    const res = await fetch(
      `/api/qr/${qrCode.id}/scans?campaignId=${campaignId}&limit=20`,
    );
    if (res.ok) {
      const data = await res.json();
      setScans(data.scans ?? []);
    }
    setLoadingScans(false);
  }, [qrCode.id, campaignId]);

  useEffect(() => { loadScans(); }, [loadScans]);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(qrCode.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const archive = async () => {
    if (!confirm("Archive this QR code?")) return;
    setArchiving(true);
    await fetch(`/api/qr/${qrCode.id}?campaignId=${campaignId}`, { method: "DELETE" });
    router.push("/qr");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/qr"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        QR Capture
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <img
          src={qrCode.qrImageUrl}
          alt="QR code"
          className="h-24 w-24 rounded-2xl bg-white p-1.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white mb-1">
            {qrCode.label ?? `${qrCode.type} QR`}
          </h1>
          {qrCode.locationName && (
            <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
              <MapPin className="h-3.5 w-3.5" />
              {qrCode.locationName}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                qrCode.status === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
              }`}
            >
              {qrCode.status}
            </span>
            <span className="text-slate-500 text-xs">{qrCode.type.replace(/_/g, " ")}</span>
            {qrCode.teaserMode && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                teaser mode
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <a
            href={qrCode.qrImageUrl}
            download={`qr-${qrCode.token}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download className="h-4 w-4" />
          </a>
          <a
            href={qrCode.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {qrCode.status !== "archived" && (
            <button
              onClick={archive}
              disabled={archiving}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-red-400 transition-colors"
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Scans", value: qrCode.scanCount, icon: QrCode },
          { label: "Prospects", value: qrCode.prospectCount, icon: Users },
          { label: "Sign Requests", value: qrCode.signOpportunityCount, icon: MapPin },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/60 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 text-xs">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Landing URL */}
      <div className="bg-slate-800/60 border border-white/5 rounded-xl p-4 mb-6">
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Landing URL</div>
        <div className="flex items-center gap-3">
          <code className="text-[#1D9E75] text-sm break-all flex-1">{qrCode.publicUrl}</code>
          <button onClick={copyUrl} className="text-slate-400 hover:text-white flex-shrink-0">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Recent scans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent Scans</h2>
          <span className="text-slate-500 text-xs">{qrCode.scanCount} total</span>
        </div>

        {loadingScans ? (
          <div className="text-slate-400 text-sm">Loading scans…</div>
        ) : scans.length === 0 ? (
          <div className="text-center py-10 bg-slate-800/40 border border-white/5 rounded-xl">
            <Eye className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No scans yet. Share this QR code to start capturing.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-3 p-3 bg-slate-800/40 border border-white/5 rounded-xl"
              >
                <div className="text-lg">
                  {scan.deviceClass === "mobile" ? "📱" : scan.deviceClass === "tablet" ? "📟" : "💻"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">
                    {scan.capturedName ?? "Anonymous"}
                    {scan.isRepeat && (
                      <span className="ml-2 text-xs text-slate-500">(repeat)</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {scan.intent?.replace(/_/g, " ") ?? "no intent"} ·{" "}
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STAGE_COLORS[scan.conversionStage] ?? "bg-slate-500/30 text-slate-300"
                  }`}
                >
                  {scan.conversionStage.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View prospects link */}
      {qrCode.prospectCount > 0 && (
        <div className="mt-6">
          <Link
            href={`/qr/prospects`}
            className="flex items-center justify-between p-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl hover:bg-[#1D9E75]/20 transition-colors"
          >
            <div>
              <div className="text-[#1D9E75] font-semibold text-sm">View all prospects from this code</div>
              <div className="text-slate-400 text-xs mt-0.5">{qrCode.prospectCount} prospects captured</div>
            </div>
            <ArrowLeft className="h-4 w-4 text-[#1D9E75] rotate-180" />
          </Link>
        </div>
      )}
    </div>
  );
}
