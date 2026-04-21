"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, Mail, Twitter, Facebook,
  Instagram, Linkedin, Bell, BellOff, User,
  MapPin, Briefcase, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const STATUS_LABEL: Record<string, string> = {
  announced:  "Announced",
  nominated:  "Nominated",
  certified:  "Certified",
  withdrawn:  "Withdrawn",
  elected:    "Elected",
  defeated:   "Defeated",
};

const OFFICE_LABEL: Record<string, string> = {
  councillor:           "City Councillor",
  mayor:                "Mayor",
  mp:                   "Member of Parliament",
  mpp:                  "Member of Provincial Parliament",
  regional_councillor:  "Regional Councillor",
};

interface Socials {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
}

interface Candidate {
  id: string;
  fullName: string;
  office: string;
  wardOrRiding: string | null;
  jurisdictionRef: string;
  party: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  socials: unknown;
  campaignStatus: string;
  officialId: string | null;
  createdAt: Date;
}

export default function CandidateProfileClient({ candidate }: { candidate: Candidate }) {
  const { data: session } = useSession();
  const [supporting, setSupporting] = useState(false);
  const [loading, setLoading] = useState(false);

  const socials = (candidate.socials ?? {}) as Socials;

  async function toggleSupport() {
    if (!session?.user) { toast.error("Sign in to support candidates"); return; }
    if (loading) return;
    const method = supporting ? "DELETE" : "POST";
    setSupporting(!supporting);
    setLoading(true);
    try {
      const res = await fetch(`/api/social/candidates/${candidate.id}/support`, { method });
      if (!res.ok) throw new Error();
      toast.success(supporting ? "Support removed." : "Support recorded — you will be notified of updates.");
    } catch {
      setSupporting(supporting);
      toast.error("Could not update support. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#080D14]">
      {/* Header */}
      <div className="bg-white dark:bg-[#0A2342] border-b border-gray-200 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/social/officials"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All candidates & officials
          </Link>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#0A2342] dark:bg-white/10 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {candidate.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {candidate.fullName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">
                {OFFICE_LABEL[candidate.office] ?? candidate.office}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10">
                  CANDIDATE
                </span>
                <span className="text-[11px] text-gray-400 dark:text-white/30 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {candidate.wardOrRiding
                    ? `${candidate.wardOrRiding}, ${candidate.jurisdictionRef}`
                    : candidate.jurisdictionRef}
                </span>
                {candidate.party && (
                  <span className="text-[11px] text-gray-400 dark:text-white/30">
                    {candidate.party}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-white/40">Status:</span>
            <span className="text-xs font-bold text-gray-700 dark:text-white/70 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4C8]" />
              {STATUS_LABEL[candidate.campaignStatus] ?? candidate.campaignStatus}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4">
            <motion.button
              onClick={toggleSupport}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black tracking-wide border transition-all",
                supporting
                  ? "bg-[#00D4C8]/10 border-[#00D4C8]/30 text-[#00D4C8]"
                  : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:border-[#00D4C8]/40 hover:text-[#00D4C8]"
              )}
            >
              {supporting ? <><BellOff className="w-4 h-4" /> FOLLOWING</> : <><Bell className="w-4 h-4" /> FOLLOW</>}
            </motion.button>

            {candidate.website && (
              <a
                href={candidate.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black tracking-wide border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/50 hover:border-[#00D4C8]/40 hover:text-[#00D4C8] transition-all"
              >
                <Globe className="w-4 h-4" /> WEBSITE
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Claim your profile CTA */}
        <div className="rounded-2xl border border-[#00D4C8]/20 bg-[#00D4C8]/5 dark:bg-[#00D4C8]/[0.06] p-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[#00D4C8] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Is this your profile?
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                Claim this profile to post updates, run polls, and engage directly with voters in your ward.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-full text-xs font-black text-[#080D14] bg-[#00D4C8] hover:bg-[#00BFB4] transition-colors"
              >
                Claim your profile
              </Link>
            </div>
          </div>
        </div>

        {/* Contact & social links */}
        {(candidate.email || candidate.phone || socials.twitter || socials.facebook || socials.instagram || socials.linkedin) && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4 space-y-3">
            <p className="text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest">Contact</p>
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 hover:text-[#00D4C8] transition-colors">
                <Mail className="w-4 h-4 text-gray-400 dark:text-white/30" />
                {candidate.email}
              </a>
            )}
            <div className="flex items-center gap-3 pt-1">
              {socials.twitter && (
                <a href={`https://twitter.com/${socials.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-white/30 hover:text-[#00D4C8] transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-white/30 hover:text-[#00D4C8] transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {socials.instagram && (
                <a href={`https://instagram.com/${socials.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-white/30 hover:text-[#00D4C8] transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {socials.linkedin && (
                <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-white/30 hover:text-[#00D4C8] transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Running for */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4">
          <p className="text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest mb-2">Running for</p>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#00D4C8] flex-shrink-0" />
            <p className="text-sm text-gray-900 dark:text-white font-semibold">
              {OFFICE_LABEL[candidate.office] ?? candidate.office}
              {candidate.wardOrRiding && ` — ${candidate.wardOrRiding}`}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <MapPin className="w-4 h-4 text-[#00D4C8] flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-white/70">{candidate.jurisdictionRef}</p>
          </div>
          {candidate.party && (
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1.5">{candidate.party}</p>
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-white/25 text-center pb-4">
          Candidate detected by Poll City intelligence · Claim your profile to add your platform
        </p>
      </div>
    </div>
  );
}
