"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Plus, Globe, Lock, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

interface Props {
  pollId: string;
  voterUrl: string;
  isManager: boolean;
  visibility: string;
}

export default function LivePageActions({ pollId, voterUrl, isManager, visibility }: Props) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function copyLink() {
    const fullUrl = `${window.location.origin}${voterUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success(visibility === "campaign_only" ? "Campaign link copied" : "Voter link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const visibilityNote =
    visibility === "public"
      ? "This poll is public — share the link below so voters can participate on Poll City Social."
      : visibility === "campaign_only"
      ? "This poll is campaign-only — only your team members can vote."
      : "This poll is unlisted — anyone with the link can vote.";

  const VisIcon = visibility === "public" ? Globe : visibility === "campaign_only" ? Lock : EyeOff;

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <VisIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-500">{visibilityNote}</p>
      </div>

      {/* Share link row */}
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 font-mono truncate select-all">
          {typeof window !== "undefined" ? `${window.location.origin}${voterUrl}` : voterUrl}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={copyLink}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 min-h-[44px] ${
            copied
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-white border border-gray-200 text-gray-700 hover:border-[#1D9E75] hover:text-[#1D9E75]"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy"}
        </motion.button>
      </div>

      {/* New poll shortcut for managers */}
      {isManager && (
        <div className="pt-1 border-t border-gray-100">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={() => router.push("/polls/new")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1D9E75] transition-colors"
          >
            <Plus className="w-4 h-4" /> Create another poll
          </motion.button>
        </div>
      )}
    </div>
  );
}
