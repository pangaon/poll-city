import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import {
  CheckCircle, Calendar, Mail, Phone, Globe, Shield,
  Twitter, Facebook, Instagram, Linkedin, ExternalLink,
  Trophy, Clock, TrendingUp, ChevronRight, MapPin,
  Users, Heart, Building2, Newspaper, Star, BarChart2,
  Award, Megaphone, FileText,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import OfficialNewsletter from "./official-newsletter";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

/* ─── Committee context descriptions ─────────────────────────── */
const COMMITTEE_CONTEXT: Record<string, string> = {
  "Finance/Budget Chair": "Oversees the annual municipal budget — allocating funds for roads, parks, services, and community programs.",
  "Planning and Economic Development Committee": "Reviews major development applications and regional growth strategy for Durham Region.",
  "Durham Region Transit Commission": "Sets transit policy for a network serving 700,000+ residents across Durham Region.",
  "Durham Environmental and Climate Advisory Committee": "Advises on environmental policy and climate action across Durham Region.",
  "Durham Region Anti-Racism Taskforce": "Guides regional policies on anti-racism, equity, and inclusion in government services.",
  "Committee of the Whole": "Full council sitting as a committee — reviews major policy and budget decisions before formal approval.",
  "Whitby Diversity and Inclusion Advisory Committee": "Ensures Whitby's policies reflect the needs of its diverse community.",
  "Ontario Big City Mayors (OBCM)": "Represents Ontario's large cities in provincial policy discussions and advocacy.",
  "Mayor's Tariff Task Force": "Led municipal response to federal and provincial tariff impacts on local businesses.",
};

/* ─── Priority icon map ───────────────────────────────────────── */
const PRIORITY_ICONS: Record<string, React.ElementType> = {
  healthcare: Heart,
  community: Building2,
  infrastructure: TrendingUp,
  environment: MapPin,
  finance: Award,
};

interface CommitteeRole {
  role: string;
  committee: string;
  level: string;
  year: string;
}

function parseCommitteeRoles(json: unknown): CommitteeRole[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (item): item is CommitteeRole =>
      typeof item === "object" &&
      item !== null &&
      "role" in item &&
      "committee" in item
  );
}

function daysToElection(): number {
  return Math.max(0, differenceInDays(new Date("2026-10-26"), new Date()));
}

function fmtDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...opts,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/* ─── Metadata ────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
    const o = await prisma.official.findUnique({
      where: { id: params.id },
      select: { name: true, title: true, district: true, bio: true, photoUrl: true },
    });
    if (!o) return { title: "Official Not Found" };
    return {
      title: `${o.name} — ${o.district} | Poll City`,
      description:
        o.bio?.slice(0, 160) ??
        `${o.title ?? "Elected official"} for ${o.district}. View profile on Poll City.`,
      openGraph: {
        title: `${o.name} — ${o.district}`,
        description: o.bio?.slice(0, 160) ?? undefined,
        images: o.photoUrl ? [o.photoUrl] : undefined,
        type: "profile",
      },
    };
  } catch {
    return { title: "Official Profile" };
  }
}

/* ─── Page ────────────────────────────────────────────────────── */
export default async function OfficialSitePage({
  params,
}: {
  params: { id: string };
}) {
  /* 1 — Core official */
  let official;
  try {
    official = await prisma.official.findUnique({
      where: { id: params.id },
      include: {
        campaigns: {
          select: {
            id: true,
            slug: true,
            isPublic: true,
            name: true,
            candidateName: true,
            candidateTitle: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        questions: {
          where: { isPublic: true, answer: { not: null } },
          orderBy: { answeredAt: "desc" },
          take: 6,
          select: { id: true, question: true, answer: true, answeredAt: true },
        },
      },
    });
  } catch {
    notFound();
  }

  if (!official) notFound();

  /* 2 — Extended data with graceful fallbacks */
  const [
    prioritiesResult,
    accomplishmentsResult,
    galleryResult,
    approvalRatingResult,
    electionResultsResult,
  ] = await Promise.allSettled([
    prisma.officialPriority.findMany({
      where: { officialId: official.id },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.officialAccomplishment.findMany({
      where: { officialId: official.id },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.officialGalleryPhoto.findMany({
      where: { officialId: official.id, isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.approvalRating.findUnique({ where: { officialId: official.id } }),
    prisma.electionResult.findMany({
      where: {
        candidateName: {
          contains:
            official.lastName ??
            official.name.trim().split(/\s+/).pop() ??
            "",
          mode: "insensitive",
        },
      },
      orderBy: { electionDate: "desc" },
      take: 6,
    }),
  ]);

  const priorities =
    prioritiesResult.status === "fulfilled" ? prioritiesResult.value : [];
  const accomplishments =
    accomplishmentsResult.status === "fulfilled"
      ? accomplishmentsResult.value
      : [];
  const gallery =
    galleryResult.status === "fulfilled" ? galleryResult.value : [];
  const approvalRating =
    approvalRatingResult.status === "fulfilled"
      ? approvalRatingResult.value
      : null;
  const electionResults =
    electionResultsResult.status === "fulfilled"
      ? electionResultsResult.value
      : [];

  /* 3 — Approval pct computed from raw counts */
  const ar = approvalRating;
  const approvePct = ar && ar.totalSignals > 0
    ? Math.round((ar.positiveCount / ar.totalSignals) * 100)
    : ar ? Math.round(ar.score) : 0;
  const disapprovePct = ar && ar.totalSignals > 0
    ? Math.round((ar.negativeCount / ar.totalSignals) * 100)
    : 0;
  const neutralPct = ar ? Math.max(0, 100 - approvePct - disapprovePct) : 0;

  /* 4 — Derived values */
  const committeeRoles = parseCommitteeRoles(official.committeeRoles);
  const heroPhoto =
    official.photoUrl ??
    (gallery.length > 0 ? gallery[0].url : null);
  const days = daysToElection();
  const campaign = official.campaigns[0] ?? null;
  const firstName = official.firstName ?? official.name.split(" ")[0];
  const initials = official.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const yearsServed =
    official.termStart
      ? Math.max(
          1,
          Math.floor(
            differenceInDays(new Date(), new Date(official.termStart)) / 365
          )
        )
      : null;

  const localRoles = committeeRoles.filter((r) => r.level === "local");
  const regionalRoles = committeeRoles.filter((r) => r.level === "regional");
  const otherRoles = committeeRoles.filter(
    (r) => r.level !== "local" && r.level !== "regional"
  );

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>

      {/* ── Sticky top nav ──────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          borderColor: "#e2e8f0",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5"
            >
              <span
                className="text-base font-black tracking-tight"
                style={{ color: NAVY }}
              >
                Poll City
              </span>
            </Link>
            <span className="text-slate-300 text-sm">·</span>
            <span className="text-sm text-slate-500 font-medium hidden sm:block">
              Official Profile
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!official.isClaimed && (
              <Link
                href={`/claim/${official.externalId ?? official.id}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors"
                style={{
                  color: AMBER,
                  borderColor: `${AMBER}40`,
                  background: `${AMBER}08`,
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                Is this you? Claim profile
              </Link>
            )}
            <Link
              href={`/social/politicians/${official.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: NAVY }}
            >
              <Star className="w-3.5 h-3.5" />
              Follow on Poll City
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          minHeight: 400,
          background: `linear-gradient(160deg, ${NAVY} 0%, #0e3670 55%, #081e3c 100%)`,
        }}
      >
        {/* Blurred photo backdrop */}
        {heroPhoto && (
          <div className="absolute inset-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPhoto}
              alt=""
              aria-hidden
              className="w-full h-full object-cover object-top opacity-[0.13] blur-2xl scale-110"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${NAVY}e0 0%, ${NAVY}cc 60%, ${NAVY}f5 100%)`,
              }}
            />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-10">
          {/* Campaign running badge */}
          {campaign && (
            <div className="mb-5">
              <span
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-black"
                style={{
                  background: `${AMBER}18`,
                  color: AMBER,
                  border: `1px solid ${AMBER}35`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                Running for {campaign.candidateTitle ?? campaign.name} · 2026
              </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div
                className="overflow-hidden shadow-2xl"
                style={{
                  width: 140,
                  height: 168,
                  borderRadius: 22,
                  border: "3px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {heroPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroPhoto}
                    alt={official.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #1a3a6e, #2563ab)",
                    }}
                  >
                    <span className="text-white font-black text-4xl tracking-tight">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              {official.isClaimed && (
                <div
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-xl"
                  style={{ background: GREEN, border: "3px solid white" }}
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Identity block */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-1"
              >
                {official.name}
              </h1>
              <p className="text-lg font-semibold mb-0.5" style={{ color: "#93c5fd" }}>
                {official.title}
              </p>
              <p className="text-base mb-4" style={{ color: "#bfdbfe" }}>
                {official.district}
                {official.province ? ` · ${official.province}` : ""}
              </p>

              {/* Tagline */}
              {official.tagline && (
                <div
                  className="mb-5 pl-4 border-l-2"
                  style={{ borderColor: "rgba(255,255,255,0.25)" }}
                >
                  <p
                    className="text-sm italic leading-relaxed"
                    style={{ color: "rgba(219,234,254,0.85)" }}
                  >
                    &ldquo;{official.tagline}&rdquo;
                  </p>
                </div>
              )}

              {/* Committee chips */}
              {committeeRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {committeeRoles.slice(0, 4).map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold"
                      style={
                        r.level === "local"
                          ? {
                              background: "rgba(255,255,255,0.12)",
                              color: "rgba(255,255,255,0.9)",
                              border: "1px solid rgba(255,255,255,0.2)",
                            }
                          : {
                              background: `${GREEN}22`,
                              color: "#6ee7b7",
                              border: `1px solid ${GREEN}40`,
                            }
                      }
                    >
                      {r.role === "Member" ? r.committee : r.role}
                    </span>
                  ))}
                  {committeeRoles.length > 4 && (
                    <span
                      className="inline-flex items-center text-xs px-3 py-1.5 rounded-full font-bold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      +{committeeRoles.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Social links */}
              <div className="flex items-center gap-2 mb-6">
                {official.website && (
                  <a
                    href={official.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Globe className="w-4 h-4 text-white/60" />
                  </a>
                )}
                {official.twitter && (
                  <a
                    href={
                      official.twitter.startsWith("http")
                        ? official.twitter
                        : `https://twitter.com/${official.twitter}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Twitter className="w-4 h-4 text-white/60" />
                  </a>
                )}
                {official.facebook && (
                  <a
                    href={official.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Facebook className="w-4 h-4 text-white/60" />
                  </a>
                )}
                {official.instagram && (
                  <a
                    href={
                      official.instagram.startsWith("http")
                        ? official.instagram
                        : `https://instagram.com/${official.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Instagram className="w-4 h-4 text-white/60" />
                  </a>
                )}
                {official.linkedIn && (
                  <a
                    href={official.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Linkedin className="w-4 h-4 text-white/60" />
                  </a>
                )}
                {official.email && (
                  <a
                    href={`mailto:${official.email}`}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Mail className="w-4 h-4 text-white/60" />
                  </a>
                )}
              </div>

              {/* CTAs */}
              <div className="flex gap-3 flex-wrap">
                <Link
                  href={`/social/politicians/${official.id}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90"
                  style={{
                    background: "white",
                    color: NAVY,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                  }}
                >
                  <Star className="w-4 h-4" style={{ color: AMBER }} />
                  Follow on Poll City
                </Link>
                {campaign?.isPublic && campaign.slug && (
                  <Link
                    href={`/candidates/${campaign.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90"
                    style={{
                      background: `linear-gradient(135deg, ${GREEN}, #15816a)`,
                      boxShadow: `0 4px 20px ${GREEN}55`,
                    }}
                  >
                    <Megaphone className="w-4 h-4" />
                    Campaign Website
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ background: "white", borderColor: "#e2e8f0" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
            {[
              {
                label: approvalRating
                  ? "Public Approval"
                  : "East Ward 4",
                value: approvalRating
                  ? `${approvePct}%`
                  : "Whitby",
                sub: approvalRating
                  ? `${approvalRating.totalSignals} signals`
                  : "Ontario",
                color: GREEN,
              },
              {
                label: "Days to Election",
                value: days.toString(),
                sub: "Oct 26, 2026",
                color: AMBER,
              },
              {
                label: "Years of Service",
                value: yearsServed ? `${yearsServed}+` : "Since 2018",
                sub: official.termStart
                  ? `Elected ${new Date(official.termStart).getFullYear()}`
                  : "Municipal",
                color: NAVY,
              },
              {
                label: "Level of Government",
                value: "Regional",
                sub: "Durham Region",
                color: "#64748b",
              },
            ].map(({ label, value, sub, color }) => (
              <div
                key={label}
                className="py-5 px-4 text-center first:border-l-0"
              >
                <p
                  className="text-2xl md:text-3xl font-black leading-none mb-0.5"
                  style={{ color }}
                >
                  {value}
                </p>
                <p className="text-xs font-black text-slate-500 mt-1 uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">

          {/* ── Main column ──────────────────────────────────────── */}
          <div className="md:col-span-2 space-y-6">

            {/* About */}
            {official.bio && (
              <div
                className="bg-white rounded-3xl p-6"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-4">
                  About {firstName}
                </p>
                <p className="text-slate-700 leading-relaxed text-[15px]">
                  {official.bio}
                </p>
                {(official.termStart || official.termEnd) && (
                  <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
                    {official.termStart && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium">
                          In office since
                        </p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {fmtDate(official.termStart, {
                            year: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    )}
                    {official.termEnd && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium">
                          Current term ends
                        </p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {fmtDate(official.termEnd, {
                            year: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Platform priorities */}
            {priorities.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-6 py-4 border-b border-slate-50">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Platform · Key Priorities
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {priorities.map(
                    (
                      priority: {
                        id: string;
                        title: string;
                        body: string;
                        icon: string | null;
                        category: string | null;
                        displayOrder: number;
                      },
                      idx: number
                    ) => {
                      const Icon =
                        PRIORITY_ICONS[priority.category ?? ""] ?? Building2;
                      return (
                        <div key={priority.id} className="flex items-stretch">
                          <div
                            className="w-16 flex items-center justify-center flex-shrink-0 py-5"
                            style={{
                              background:
                                idx % 2 === 0
                                  ? `${NAVY}08`
                                  : `${GREEN}08`,
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Icon
                                className="w-4 h-4"
                                style={{
                                  color: idx % 2 === 0 ? NAVY : GREEN,
                                }}
                              />
                              <span
                                className="text-xs font-black"
                                style={{
                                  color: idx % 2 === 0 ? NAVY : GREEN,
                                }}
                              >
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 px-5 py-5">
                            <p className="text-sm font-black text-slate-900 leading-snug mb-1.5">
                              {priority.title}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {priority.body}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Service record */}
            {accomplishments.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-6 py-4 border-b border-slate-50">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Service Record
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {accomplishments.map(
                    (acc: {
                      id: string;
                      title: string;
                      description: string;
                      year: number | null;
                      category: string | null;
                    }) => (
                      <div
                        key={acc.id}
                        className="flex items-start gap-4 px-6 py-5"
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${GREEN}15` }}
                        >
                          <CheckCircle
                            className="w-4 h-4"
                            style={{ color: GREEN }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-black text-slate-900 leading-snug">
                              {acc.title}
                            </p>
                            {acc.year && (
                              <span
                                className="text-xs font-bold flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full"
                                style={{
                                  color: NAVY,
                                  background: `${NAVY}0c`,
                                }}
                              >
                                {acc.year}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {acc.description}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Election history — from Ontario Open Data */}
            {electionResults.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Election History
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" style={{ color: AMBER }} />
                    <span className="text-xs font-bold" style={{ color: AMBER }}>
                      Ontario Open Data
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500">
                          Year
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 hidden sm:table-cell">
                          Jurisdiction
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Votes
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                          Share
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-500">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {electionResults.map(
                        (row: {
                          id: string;
                          electionDate: Date;
                          jurisdiction: string;
                          candidateName: string;
                          votesReceived: number;
                          totalVotesCast: number;
                          percentage: number;
                          won: boolean;
                        }) => (
                          <tr
                            key={row.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4 font-black text-slate-900">
                              {new Date(row.electionDate).getFullYear()}
                            </td>
                            <td className="px-4 py-4 text-slate-600 text-xs hidden sm:table-cell">
                              {row.jurisdiction}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-slate-800">
                              {row.votesReceived.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div
                                  className="hidden sm:block h-1.5 rounded-full"
                                  style={{
                                    width: 40,
                                    background: "#e2e8f0",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(100, row.percentage)}%`,
                                      background: row.won ? GREEN : "#94a3b8",
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-slate-700">
                                  {row.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {row.won ? (
                                <span
                                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                                  style={{
                                    color: GREEN,
                                    background: `${GREEN}15`,
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3" /> Elected
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                                  Not elected
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-50">
                  <p className="text-xs text-slate-400">
                    Source: Elections Ontario Open Data · Official certified results
                  </p>
                </div>
              </div>
            )}

            {/* Constituent Q&A */}
            {official.questions.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Constituent Q&amp;A
                  </p>
                  <Link
                    href={`/social/politicians/${official.id}`}
                    className="text-xs font-bold flex items-center gap-1 hover:opacity-70"
                    style={{ color: NAVY }}
                  >
                    Ask a question <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {official.questions.map(
                    (q: {
                      id: string;
                      question: string;
                      answer: string | null;
                      answeredAt: Date | null;
                    }) => (
                      <div key={q.id} className="px-6 py-5">
                        <p className="text-sm font-black text-slate-900 mb-2 leading-snug">
                          {q.question}
                        </p>
                        {q.answer && (
                          <div
                            className="pl-4 py-3 pr-3 rounded-r-2xl"
                            style={{
                              borderLeft: `3px solid ${GREEN}`,
                              background: `${GREEN}08`,
                            }}
                          >
                            <p
                              className="text-xs font-black mb-1"
                              style={{ color: GREEN }}
                            >
                              {firstName} replied
                              {q.answeredAt
                                ? ` · ${timeAgo(q.answeredAt.toISOString())}`
                                : ""}
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {q.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
                <div className="px-6 py-4 border-t border-slate-50">
                  <Link
                    href={`/social/politicians/${official.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl text-white"
                    style={{ background: NAVY }}
                  >
                    Ask {firstName} a question
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-6 py-4 border-b border-slate-50">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    In the Community
                  </p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map(
                    (photo: {
                      id: string;
                      url: string;
                      caption: string | null;
                      altText: string | null;
                    }) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-2xl overflow-hidden bg-slate-100 relative"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={
                            photo.altText ??
                            photo.caption ??
                            `${official.name} community photo`
                          }
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {photo.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                            <p className="text-white text-xs leading-tight font-medium">
                              {photo.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Approval rating */}
            {approvalRating && (
              <div
                className="bg-white rounded-3xl p-5"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-4">
                  Public Approval
                </p>
                <div className="text-center mb-4">
                  <p
                    className="text-5xl font-black leading-none"
                    style={{ color: GREEN }}
                  >
                    {approvePct}%
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-1.5">
                    {approvalRating.totalSignals.toLocaleString()} public signals
                  </p>
                </div>
                <div
                  className="h-3 rounded-full overflow-hidden flex mb-3"
                  style={{ background: "#f1f5f9" }}
                >
                  <div
                    style={{
                      width: `${approvePct}%`,
                      background: `linear-gradient(90deg,${GREEN},#22c55e)`,
                    }}
                    className="h-full rounded-l-full"
                  />
                  <div
                    style={{
                      width: `${neutralPct}%`,
                      background: `linear-gradient(90deg,${AMBER},#f59e0b)`,
                    }}
                    className="h-full"
                  />
                  <div
                    style={{
                      width: `${disapprovePct}%`,
                      background: "linear-gradient(90deg,#f87171,#ef4444)",
                    }}
                    className="h-full rounded-r-full"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span style={{ color: GREEN }}>
                    {approvePct}% approve
                  </span>
                  <span className="text-red-500">
                    {disapprovePct}% oppose
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Link
                    href={`/social/politicians/${official.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all"
                    style={{ background: `${GREEN}15`, color: GREEN }}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Rate {firstName}&apos;s performance
                  </Link>
                </div>
              </div>
            )}

            {/* Election countdown */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, #0e3670 100%)`,
                boxShadow: `0 4px 20px ${NAVY}40`,
              }}
            >
              <div className="px-5 py-5 text-center">
                <Calendar className="w-6 h-6 text-blue-300 mx-auto mb-2" />
                <p
                  className="text-4xl font-black text-white leading-none mb-1"
                >
                  {days}
                </p>
                <p className="text-xs font-bold text-blue-300">
                  Days to Election
                </p>
                <p className="text-xs text-blue-200/60 mt-0.5">
                  October 26, 2026
                </p>
                {campaign?.isPublic && campaign.slug && (
                  <Link
                    href={`/candidates/${campaign.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl text-white w-full justify-center"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    Support the Campaign
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Committee roles */}
            {committeeRoles.length > 0 && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Roles &amp; Committees
                  </p>
                </div>

                {localRoles.length > 0 && (
                  <div>
                    <p
                      className="px-5 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: NAVY }}
                    >
                      Town of Whitby
                    </p>
                    <div className="divide-y divide-slate-50">
                      {localRoles.map((r, i) => (
                        <div key={i} className="px-5 py-3">
                          <p className="text-xs font-black text-slate-900 leading-snug">
                            {r.role === "Member" ? r.committee : r.role}
                          </p>
                          {r.role !== "Member" && (
                            <p className="text-xs text-slate-500 mt-0.5">{r.committee}</p>
                          )}
                          {COMMITTEE_CONTEXT[r.committee] && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {COMMITTEE_CONTEXT[r.committee]}
                            </p>
                          )}
                          <p
                            className="text-[10px] font-bold mt-1.5"
                            style={{ color: NAVY }}
                          >
                            {r.year}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {regionalRoles.length > 0 && (
                  <div>
                    <p
                      className="px-5 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: GREEN }}
                    >
                      Durham Region
                    </p>
                    <div className="divide-y divide-slate-50">
                      {regionalRoles.map((r, i) => (
                        <div key={i} className="px-5 py-3">
                          <p className="text-xs font-black text-slate-900 leading-snug">
                            {r.committee}
                          </p>
                          {COMMITTEE_CONTEXT[r.committee] && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {COMMITTEE_CONTEXT[r.committee]}
                            </p>
                          )}
                          <p
                            className="text-[10px] font-bold mt-1.5"
                            style={{ color: GREEN }}
                          >
                            {r.year}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherRoles.length > 0 && (
                  <div>
                    <p
                      className="px-5 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
                    >
                      Other
                    </p>
                    <div className="divide-y divide-slate-50">
                      {otherRoles.map((r, i) => (
                        <div key={i} className="px-5 py-3">
                          <p className="text-xs font-black text-slate-900">
                            {r.role === "Member" ? r.committee : r.role}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                            {r.year}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact */}
            {(official.email || official.phone || official.website) && (
              <div
                className="bg-white rounded-3xl overflow-hidden"
                style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
              >
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Contact
                  </p>
                </div>
                <div className="divide-y divide-slate-50">
                  {official.email && (
                    <a
                      href={`mailto:${official.email}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "#eff6ff" }}
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 truncate">
                        {official.email}
                      </span>
                    </a>
                  )}
                  {official.phone && (
                    <a
                      href={`tel:${official.phone}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "#eff6ff" }}
                      >
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {official.phone}
                      </span>
                    </a>
                  )}
                  {official.website && (
                    <a
                      href={official.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "#eff6ff" }}
                      >
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-blue-600 flex-1">
                        Official website
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Follow on Poll City Social */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${GREEN}18 0%, ${GREEN}08 100%)`,
                border: `1.5px solid ${GREEN}30`,
              }}
            >
              <div className="px-5 py-5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: `${GREEN}25` }}
                >
                  <Star className="w-5 h-5" style={{ color: GREEN }} />
                </div>
                <p className="text-sm font-black text-slate-900 mb-1">
                  Follow {firstName} on Poll City Social
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Get posts, updates, Q&amp;A answers, and live polls from{" "}
                  {firstName} — all in one place.
                </p>
                <Link
                  href={`/social/politicians/${official.id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90"
                  style={{ background: GREEN, boxShadow: `0 4px 14px ${GREEN}50` }}
                >
                  <Users className="w-4 h-4" />
                  Follow {firstName}
                </Link>
              </div>
            </div>

            {/* Share */}
            <div
              className="bg-white rounded-3xl p-5"
              style={{ border: "1.5px solid #e2e8f0", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}
            >
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
                Share This Profile
              </p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${official.name} — ${official.district}`)}&url=${encodeURIComponent(`https://poll.city/officials/${official.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-sky-50"
                  style={{ color: "#0ea5e9", borderColor: "#bae6fd" }}
                >
                  <Twitter className="w-3.5 h-3.5" /> Share
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`${official.name} on Poll City`)}&body=${encodeURIComponent(`https://poll.city/officials/${official.id}`)}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://poll.city/officials/${official.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors hover:bg-blue-50"
                  style={{ color: "#3b82f6", borderColor: "#bfdbfe" }}
                >
                  <Facebook className="w-3.5 h-3.5" /> Share
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Newsletter section ──────────────────────────────────── */}
      <div
        className="mt-8"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0e3670 100%)` }}
      >
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Newspaper className="w-6 h-6 text-white/80" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              Stay informed about {official.district}
            </h2>
            <p className="text-blue-200/80 text-sm mb-6 leading-relaxed">
              Subscribe to {firstName}&apos;s newsletter for council updates, community news, and announcements — delivered directly to your inbox.
            </p>
            <OfficialNewsletter officialId={official.id} firstName={firstName} />
          </div>
        </div>
      </div>

      {/* ── Claim CTA (if unclaimed) ───────────────────────────── */}
      {!official.isClaimed && (
        <div
          className="border-t"
          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#fef9c3" }}
              >
                <Shield className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-amber-900">
                  Is this your profile, {firstName}?
                </p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Claim it to manage your presence, respond to voters, publish updates, and launch your full campaign toolkit — no agency needed.
                </p>
              </div>
              <Link
                href={`/claim/${official.externalId ?? official.id}`}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-black px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
                style={{ background: AMBER }}
              >
                Claim This Profile
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div
        className="border-t py-8"
        style={{ background: "#0f172a", borderColor: "#1e293b" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white">Poll City</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">
                Civic intelligence for Canadian democracy
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/social/officials"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Browse Officials
              </Link>
              <Link
                href="/signup"
                className="text-xs font-bold text-white/70 hover:text-white transition-colors"
              >
                Get your campaign profile →
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center">
              Profile data sourced from Elections Ontario Open Data, public government records, and official submissions. Poll City does not claim editorial control over content posted by elected officials.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
