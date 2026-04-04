import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { differenceInDays } from "date-fns";
import prisma from "@/lib/db/prisma";
import { getPartyColour, partyGradientStyle } from "@/lib/party-colours";
import {
  ShieldCheck, AlertCircle, Globe, Phone, Mail, Twitter,
  Facebook, Instagram, Linkedin, Trophy, CheckCircle, MapPin,
  Users, Calendar, ExternalLink, Building2,
} from "lucide-react";

interface PageProps {
  params: { id: string };
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    federal: "Federal MP",
    provincial: "Provincial MPP",
    municipal: "Municipal Official",
  };
  return map[level] ?? "Official";
}

function daysUntilElection(): number {
  const ELECTION_DATE = new Date("2026-10-26");
  return Math.max(0, differenceInDays(ELECTION_DATE, new Date()));
}

/* ─── Metadata ────────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const official = await prisma.official.findUnique({
      where: { id: params.id },
      select: { name: true, title: true, district: true, bio: true, partyName: true },
    });
    if (!official) return { title: "Official Not Found" };
    return {
      title: `${official.name} — ${official.district} | Poll City`,
      description: official.bio?.slice(0, 160) ?? `${official.title ?? "Elected official"} for ${official.district}. View profile on Poll City.`,
      openGraph: { title: `${official.name} — ${official.district}`, type: "profile" },
    };
  } catch {
    return { title: "Official Profile" };
  }
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function OfficialProfilePage({ params }: PageProps) {
  let official;
  try {
    official = await prisma.official.findUnique({
      where: { id: params.id },
      include: {
        campaigns: {
          select: {
            id: true, slug: true, isPublic: true, candidateBio: true,
            _count: {
              select: {
                contacts: { where: { supportLevel: "strong_support" } },
                polls: { where: { isActive: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        questions: {
          where: { isPublic: true, answer: { not: null } },
          orderBy: { answeredAt: "desc" },
          take: 5,
          select: { id: true, question: true, answer: true, answeredAt: true },
        },
      },
    });
  } catch {
    notFound();
  }

  if (!official) notFound();

  const party = official.partyName ?? official.party ?? null;
  const partyColour = getPartyColour(party);
  const heroStyle = partyGradientStyle(party);
  const campaign = official.campaigns[0] ?? null;
  const initials = official.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const hasSocial = official.twitter || official.facebook || official.instagram || official.linkedIn || official.website;
  const hasContact = official.phone || official.email || official.address;
  const days = daysUntilElection();

  // Election history
  let electionHistory: {
    id: string; electionDate: Date; jurisdiction: string; candidateName: string;
    votesReceived: number; totalVotesCast: number; percentage: number; won: boolean;
  }[] = [];
  try {
    const nameParts = official.name.trim().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    electionHistory = await prisma.electionResult.findMany({
      where: { candidateName: { contains: lastName, mode: "insensitive" } },
      orderBy: { electionDate: "desc" },
      take: 8,
      select: {
        id: true, electionDate: true, jurisdiction: true, candidateName: true,
        votesReceived: true, totalVotesCast: true, percentage: true, won: true,
      },
    });
  } catch { /* non-fatal */ }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Unclaimed banner ── */}
      {!official.isClaimed && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">Are you {official.firstName ?? official.name}?</span>{" "}
              This is your official Poll City profile. Claim it to manage your presence and connect with constituents.
            </p>
            <Link href={`/claim/${official.externalId ?? official.id}`}>
              <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors flex-shrink-0">
                Claim Profile →
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Verified banner ── */}
      {official.isClaimed && (
        <div className="bg-emerald-50 border-b border-emerald-200 py-2 px-4">
          <div className="container mx-auto max-w-5xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-800 font-medium">
              Verified Official Profile — Managed by {official.firstName ?? official.name}
            </p>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative text-white py-14 px-4 overflow-hidden" style={heroStyle}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-7">

            {/* Photo */}
            <div className="relative flex-shrink-0">
              <div
                className="w-36 h-36 rounded-full border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center"
                style={{ boxShadow: `0 0 0 4px ${partyColour.primary}80, 0 20px 40px rgba(0,0,0,0.3)` }}
              >
                {official.photoUrl ? (
                  <Image
                    src={official.photoUrl}
                    alt={official.name}
                    width={144}
                    height={144}
                    className="object-cover w-full h-full"
                    unoptimized={official.photoUrl.startsWith("http")}
                    priority
                  />
                ) : (
                  <span className="text-4xl font-extrabold text-white">{initials}</span>
                )}
              </div>
              {official.isClaimed && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-2 border-white shadow">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap mb-1.5">
                <h1 className="text-4xl md:text-5xl font-black">{official.name}</h1>
                {!official.isActive && (
                  <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Former Member
                  </span>
                )}
              </div>

              <p className="text-xl text-white/85 mb-2">
                {official.title} · {official.district}
              </p>

              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-4">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                  {levelLabel(String(official.level))}
                </span>
                {party && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                    {party}
                  </span>
                )}
                {official.province && (
                  <span className="bg-white/10 text-white/80 text-xs px-2.5 py-0.5 rounded-full border border-white/20">
                    {official.province}
                  </span>
                )}
              </div>

              {/* Social buttons */}
              {hasSocial && (
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  {official.website && (
                    <a href={official.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  {official.twitter && (
                    <a href={official.twitter.startsWith("http") ? official.twitter : `https://twitter.com/${official.twitter.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Twitter className="w-3.5 h-3.5" /> Twitter/X
                    </a>
                  )}
                  {official.facebook && (
                    <a href={official.facebook} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Facebook className="w-3.5 h-3.5" /> Facebook
                    </a>
                  )}
                  {official.instagram && (
                    <a href={official.instagram.startsWith("http") ? official.instagram : `https://instagram.com/${official.instagram.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </a>
                  )}
                  {official.linkedIn && (
                    <a href={official.linkedIn} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="bg-white border-b border-gray-100 py-4 px-4 shadow-sm">
        <div className="container mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { icon: Users, value: campaign?._count.contacts.toLocaleString() ?? "0", label: "Supporters" },
            { icon: Calendar, value: campaign?._count.polls.toLocaleString() ?? "0", label: "Active Polls" },
            { icon: Trophy, value: electionHistory.filter(r => r.won).length.toString(), label: "Elections Won" },
            { icon: Calendar, value: `${days}`, label: "Days to Election" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <Icon className="w-4 h-4 text-gray-400 mb-0.5" />
              <span className="text-xl font-bold text-gray-900">{value}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="md:col-span-2 space-y-6">

            {/* Bio */}
            {(official.bio ?? campaign?.candidateBio) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">About {official.firstName ?? official.name}</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {official.bio ?? campaign?.candidateBio}
                </p>
              </div>
            )}

            {/* Not claimed bio placeholder */}
            {!official.isClaimed && !official.bio && !campaign?.candidateBio && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">About {official.firstName ?? official.name}</h2>
                <p className="text-gray-400 text-sm mb-4">
                  {official.name} has not yet claimed their Poll City profile. Claim this profile to add your biography, platform, and connect with constituents.
                </p>
                <Link href={`/claim/${official.externalId ?? official.id}`}>
                  <button className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors" style={{ backgroundColor: partyColour.primary }}>
                    Claim This Profile
                  </button>
                </Link>
              </div>
            )}

            {/* Office info */}
            {hasContact && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" style={{ color: partyColour.primary }} />
                  Office Information
                </h2>
                <ul className="space-y-3">
                  {official.address && (
                    <li className="flex items-start gap-3 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: partyColour.primary }} />
                      {official.address}
                    </li>
                  )}
                  {official.phone && (
                    <li className="flex items-center gap-3">
                      <Phone className="w-4 h-4 flex-shrink-0" style={{ color: partyColour.primary }} />
                      <a href={`tel:${official.phone}`} className="text-sm text-gray-700 hover:underline">{official.phone}</a>
                    </li>
                  )}
                  {official.email && (
                    <li className="flex items-center gap-3">
                      <Mail className="w-4 h-4 flex-shrink-0" style={{ color: partyColour.primary }} />
                      <a href={`mailto:${official.email}`} className="text-sm text-gray-700 hover:underline break-all">{official.email}</a>
                    </li>
                  )}
                  {official.website && (
                    <li className="flex items-center gap-3">
                      <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: partyColour.primary }} />
                      <a href={official.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">{official.website}</a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Election history */}
            {electionHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Election History
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Year</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Jurisdiction</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Votes</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">%</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {electionHistory.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-semibold text-gray-900">{new Date(row.electionDate).getFullYear()}</td>
                          <td className="px-5 py-3 text-gray-700">{row.jurisdiction}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{row.votesReceived.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{row.percentage.toFixed(1)}%</td>
                          <td className="px-5 py-3 text-center">
                            {row.won ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Won
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Lost</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {electionHistory.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
                No election history on record for this official.
              </div>
            )}

            {/* Q&A */}
            {official.questions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Constituent Q&amp;A</h2>
                <div className="space-y-4">
                  {official.questions.map((q) => (
                    <div key={q.id} className="border-l-4 pl-4" style={{ borderColor: partyColour.primary }}>
                      <p className="font-semibold text-gray-900 text-sm">{q.question}</p>
                      <p className="text-gray-600 text-sm mt-1">{q.answer}</p>
                      {q.answeredAt && (
                        <p className="text-xs text-gray-400 mt-1">{new Date(q.answeredAt).toLocaleDateString("en-CA")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign website preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Campaign Website</h2>
              </div>
              <div className="p-6">
                {campaign?.isPublic && campaign.slug ? (
                  <>
                    {/* Browser mockup */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md mb-4">
                      <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <div className="w-3 h-3 rounded-full bg-amber-400" />
                          <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 bg-white rounded text-xs text-gray-400 px-3 py-1 text-center font-mono">
                          poll.city/candidates/{campaign.slug}
                        </div>
                      </div>
                      <div className="p-4" style={{ background: `linear-gradient(135deg, ${partyColour.primary} 0%, ${partyColour.primary}99 100%)` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg border-2 border-white">
                            {initials}
                          </div>
                          <div>
                            <p className="text-white font-bold">{official.name}</p>
                            <p className="text-white/70 text-xs">{official.district}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Your campaign website is live at{" "}
                      <span className="font-mono text-blue-600">poll.city/candidates/{campaign.slug}</span>
                    </p>
                    <Link href={`/candidates/${campaign.slug}`} target="_blank">
                      <button className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: partyColour.primary }}>
                        View My Campaign Website →
                      </button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 text-sm mb-2">
                      Claim this profile to get your campaign website.
                    </p>
                    <p className="text-gray-400 text-xs mb-4">Replaces a $5,000 custom website — live in minutes.</p>
                    <Link href={`/claim/${official.externalId ?? official.id}`}>
                      <button className="px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: partyColour.primary }}>
                        Claim This Profile
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Election countdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: partyColour.primary }} />
              <div className="text-3xl font-black text-gray-900">{days}</div>
              <div className="text-gray-500 text-xs mt-0.5">Days until Oct 26, 2026</div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Get Involved</h3>
              {campaign?.slug && campaign.isPublic ? (
                <>
                  <Link href={`/candidates/${campaign.slug}`} className="block w-full text-center py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: partyColour.primary }}>
                    Follow on Poll City
                  </Link>
                  <Link href={`/candidates/${campaign.slug}#volunteer`} className="block w-full text-center py-2.5 px-4 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 text-sm font-medium hover:bg-gray-100 transition-colors">
                    Volunteer
                  </Link>
                  <Link href={`/candidates/${campaign.slug}#sign`} className="block w-full text-center py-2.5 px-4 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 text-sm font-medium hover:bg-gray-100 transition-colors">
                    Request a Lawn Sign
                  </Link>
                </>
              ) : (
                <p className="text-gray-400 text-xs text-center py-2">
                  Claim this profile to enable engagement tools.
                </p>
              )}
            </div>

            {/* Share */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Share This Profile</h3>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${official.name} — ${official.district} on Poll City`)}&url=${encodeURIComponent(`https://poll.city/officials/${official.id}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100 hover:bg-sky-100 transition-colors"
                >
                  <Twitter className="w-3.5 h-3.5" /> Share
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`${official.name} on Poll City`)}&body=${encodeURIComponent(`https://poll.city/officials/${official.id}`)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
