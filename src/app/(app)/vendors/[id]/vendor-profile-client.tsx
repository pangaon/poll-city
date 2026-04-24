"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Star, Globe, Phone, Mail, Clock, Briefcase,
  DollarSign, MapPin, ArrowLeft, Copy, Check, ExternalLink,
  Shield,
} from "lucide-react";
import Link from "next/link";

type VendorProfile = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  bio: string | null;
  categories: string[];
  provincesServed: string[];
  serviceAreas: string[];
  tags: string[];
  isVerified: boolean;
  isFeatured: boolean;
  rating: number | null;
  reviewCount: number;
  logoUrl: string | null;
  portfolioUrls: string[];
  avgResponseHours: number | null;
  yearsExperience: number | null;
  rateFrom: number | null;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  print_shop:           "Print Shop",
  sign_crew:            "Sign Crew",
  video_production:     "Video Production",
  photography:          "Photography",
  graphic_design:       "Graphic Design",
  digital_advertising:  "Digital Ads",
  phone_banking:        "Phone Banking",
  canvassing_crew:      "Canvassing",
  campaign_manager:     "Campaign Mgr",
  financial_agent:      "Financial Agent",
  accountant:           "Accountant",
  election_lawyer:      "Election Law",
  polling_firm:         "Polling",
  opposition_research:  "Opp Research",
  event_planning:       "Events",
  translation_services: "Translation",
  speaking_coach:       "Speaking Coach",
  media_trainer:        "Media Training",
  mail_house:           "Mail House",
  merchandise:          "Merchandise",
  data_analytics:       "Data & Analytics",
  website_tech:         "Web & Tech",
  other:                "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  print_shop:           "bg-blue-100 text-blue-700",
  sign_crew:            "bg-green-100 text-green-700",
  video_production:     "bg-purple-100 text-purple-700",
  photography:          "bg-pink-100 text-pink-700",
  graphic_design:       "bg-violet-100 text-violet-700",
  digital_advertising:  "bg-cyan-100 text-cyan-700",
  phone_banking:        "bg-orange-100 text-orange-700",
  canvassing_crew:      "bg-lime-100 text-lime-700",
  campaign_manager:     "bg-amber-100 text-amber-700",
  financial_agent:      "bg-emerald-100 text-emerald-700",
  accountant:           "bg-teal-100 text-teal-700",
  election_lawyer:      "bg-indigo-100 text-indigo-700",
  polling_firm:         "bg-sky-100 text-sky-700",
  opposition_research:  "bg-red-100 text-red-700",
  event_planning:       "bg-fuchsia-100 text-fuchsia-700",
  translation_services: "bg-rose-100 text-rose-700",
  speaking_coach:       "bg-yellow-100 text-yellow-700",
  media_trainer:        "bg-orange-100 text-orange-700",
  mail_house:           "bg-blue-100 text-blue-700",
  merchandise:          "bg-purple-100 text-purple-700",
  data_analytics:       "bg-emerald-100 text-emerald-700",
  website_tech:         "bg-gray-100 text-gray-700",
  other:                "bg-gray-100 text-gray-600",
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const init = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return (
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0A2342] to-[#1D4678] flex items-center justify-center text-white text-2xl font-bold shrink-0">
      {init.toUpperCase()}
    </div>
  );
}

export default function VendorProfileClient({ vendor }: { vendor: VendorProfile }) {
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(vendor.email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const memberSince = new Date(vendor.createdAt).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/vendors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Vendor Network
      </Link>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
      >
        <div className="flex items-start gap-5">
          {vendor.logoUrl ? (
            <img
              src={vendor.logoUrl}
              alt={vendor.name}
              className="w-20 h-20 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <Initials name={vendor.name} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
              {vendor.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
              {vendor.isFeatured && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  <Star className="w-3 h-3 fill-amber-500" /> Featured
                </span>
              )}
            </div>

            {vendor.contactName && (
              <p className="text-sm text-gray-500 mb-2">{vendor.contactName}</p>
            )}

            {/* Category tags */}
            <div className="flex flex-wrap gap-1.5">
              {vendor.categories.map((cat) => (
                <span
                  key={cat}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
              ))}
            </div>
          </div>

          {vendor.rating !== null && (
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold text-gray-900">{vendor.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {vendor.reviewCount} review{vendor.reviewCount !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Stats row */}
        {(vendor.yearsExperience !== null || vendor.avgResponseHours !== null || vendor.rateFrom !== null) && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100">
            {vendor.yearsExperience !== null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>{vendor.yearsExperience} yrs experience</span>
              </div>
            )}
            {vendor.avgResponseHours !== null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Responds in ~{vendor.avgResponseHours}h</span>
              </div>
            )}
            {vendor.rateFrom !== null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>From ${vendor.rateFrom}/hr</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 ml-auto">
              <Shield className="w-3.5 h-3.5" />
              <span>Member since {memberSince}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bio */}
      {vendor.bio && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">About</h2>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{vendor.bio}</p>
        </motion.div>
      )}

      {/* Service areas */}
      {(vendor.provincesServed.length > 0 || vendor.serviceAreas.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Service Area</h2>
          {vendor.provincesServed.length > 0 && (
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Provinces served</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.provincesServed.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {vendor.serviceAreas.length > 0 && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Cities / regions</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.serviceAreas.map((a) => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tags */}
      {vendor.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Specialties</h2>
          <div className="flex flex-wrap gap-1.5">
            {vendor.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-[#0A2342]/5 text-[#0A2342] rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Portfolio */}
      {vendor.portfolioUrls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-4"
        >
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Portfolio</h2>
          <div className="space-y-2">
            {vendor.portfolioUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#1D9E75] hover:text-[#178a64] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Contact card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.25 }}
        className="bg-gradient-to-r from-[#0A2342] to-[#0d2e54] rounded-2xl p-6 text-white"
      >
        <h2 className="font-semibold text-white mb-1">Contact {vendor.name}</h2>
        <p className="text-white/60 text-sm mb-5">
          Reach out directly to discuss your campaign&apos;s needs.
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-white/50 shrink-0" />
            <span className="text-sm text-white/90 flex-1 min-w-0 truncate">{vendor.email}</span>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {vendor.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-white/50 shrink-0" />
              <a
                href={`tel:${vendor.phone}`}
                className="text-sm text-white/90 hover:text-white transition-colors"
              >
                {vendor.phone}
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:${vendor.email}?subject=Campaign inquiry via Poll City`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D9E75] hover:bg-[#178a64] text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" /> Send Email
          </a>
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Globe className="w-4 h-4" /> Visit Website
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
