"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, Badge } from "@/components/ui";
import {
  MapPin, Calendar, Users, Share2, AlertCircle, CheckCircle,
  Globe, Phone, Mail, Twitter, Facebook, Instagram, Linkedin,
  ShieldCheck, Building2, ExternalLink, Trophy,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Exported types (imported by page.tsx) ──────────────────────────────── */

export interface ElectionHistoryRow {
  id: string;
  electionDate: Date;
  jurisdiction: string;
  candidateName: string;
  votesReceived: number;
  totalVotesCast: number;
  percentage: number;
  won: boolean;
}

export interface OfficialInfo {
  id: string;
  isClaimed: boolean;
  name: string;
  title: string | null;
  level: string;
  levelBadge: string;
  photoUrl: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
}

export interface CampaignData {
  id: string;
  slug: string;
  candidateName: string | null;
  candidateTitle: string | null;
  candidateBio: string | null;
  jurisdiction: string | null;
  electionType: string;
  logoUrl: string | null;
  primaryColor: string;
  supporterCount: number;
  official: OfficialInfo | null;
}

export interface PollData {
  id: string;
  question: string;
  options: { id: string; text: string; count: number; percentage: number }[];
}

interface Props {
  campaign: CampaignData;
  polls: PollData[];
  electionHistory: ElectionHistoryRow[];
}

/* ─── Level badge colours ────────────────────────────────────────────────── */
function LevelBadge({ label }: { label: string }) {
  const colours: Record<string, string> = {
    "Federal MP": "bg-red-100 text-red-700 border-red-200",
    "Provincial MPP": "bg-blue-100 text-blue-700 border-blue-200",
    "Municipal Councillor": "bg-green-100 text-green-700 border-green-200",
  };
  const cls = colours[label] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

export default function CandidatePageClient({ campaign, polls, electionHistory }: Props) {
  const [volunteerForm, setVolunteerForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [signForm, setSignForm] = useState({ address: "", name: "", email: "" });
  const [supportForm, setSupportForm] = useState({ name: "", email: "", householdCount: 1 });
  const [questionForm, setQuestionForm] = useState({ name: "", email: "", question: "" });
  const [loading, setLoading] = useState(false);

  const off = campaign.official;
  const photoUrl = campaign.logoUrl ?? off?.photoUrl ?? null;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const hasSocialLinks = off && (off.twitter || off.facebook || off.instagram || off.linkedIn || off.website);
  const hasContactInfo = off && (off.phone || off.address || off.email);

  async function post(path: string, body: unknown, onSuccess: () => void) {
    setLoading(true);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { toast.success("Submitted!"); onSuccess(); }
      else toast.error("Something went wrong. Please try again.");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Unclaimed banner ── */}
      {off && !off.isClaimed && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4">
          <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">Are you {off.name}?</span>{" "}
              This is your official Poll City profile. Claim it to manage your presence and respond to voters.
            </p>
            <Link href={`/claim/${campaign.slug}`}>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 flex-shrink-0">
                Claim this profile
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div
        className="text-white py-12 px-4"
        style={{ background: `linear-gradient(135deg, ${campaign.primaryColor} 0%, ${campaign.primaryColor}cc 100%)` }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center gap-6">

            {/* Photo — next/image with initials fallback */}
            {photoUrl ? (
              <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-lg flex-shrink-0 overflow-hidden">
                <Image
                  src={photoUrl}
                  alt={campaign.candidateName ?? "Candidate"}
                  fill
                  className="object-cover"
                  sizes="112px"
                  unoptimized={photoUrl.startsWith("http")}
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg flex-shrink-0 bg-white/20 flex items-center justify-center">
                <span className="text-3xl font-extrabold text-white">
                  {(campaign.candidateName ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            <div className="text-center md:text-left flex-1">
              {/* Name + verified */}
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap mb-1">
                <h1 className="text-3xl md:text-4xl font-bold">{campaign.candidateName}</h1>
                {off?.isClaimed && (
                  <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-semibold px-3 py-1 rounded-full border border-white/30">
                    <ShieldCheck className="w-4 h-4" /> Verified
                  </span>
                )}
              </div>

              <p className="text-xl opacity-90 mb-2">{campaign.candidateTitle}</p>

              {/* Level badge + jurisdiction */}
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-4">
                {off?.levelBadge && <LevelBadge label={off.levelBadge} />}
                <span className="flex items-center gap-1.5 text-sm text-white/80">
                  <MapPin className="w-4 h-4" />
                  {campaign.jurisdiction}
                </span>
                <Badge variant="default" className="bg-white/20 text-white border-white/30 capitalize">
                  {campaign.electionType.replace("_", " ")}
                </Badge>
              </div>

              {/* Social links */}
              {hasSocialLinks && (
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  {off?.website && (
                    <a href={off.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  {off?.twitter && (
                    <a href={off.twitter.startsWith("http") ? off.twitter : `https://twitter.com/${off.twitter.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Twitter className="w-3.5 h-3.5" /> Twitter/X
                    </a>
                  )}
                  {off?.facebook && (
                    <a href={off.facebook} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Facebook className="w-3.5 h-3.5" /> Facebook
                    </a>
                  )}
                  {off?.instagram && (
                    <a href={off.instagram.startsWith("http") ? off.instagram : `https://instagram.com/${off.instagram.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Instagram className="w-3.5 h-3.5" /> Instagram
                    </a>
                  )}
                  {off?.linkedIn && (
                    <a href={off.linkedIn} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="md:col-span-2 space-y-8">

            {campaign.candidateBio && (
              <Card>
                <CardHeader><h2 className="text-xl font-semibold">About {campaign.candidateName}</h2></CardHeader>
                <CardContent><p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{campaign.candidateBio}</p></CardContent>
              </Card>
            )}

            {hasContactInfo && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" /> Office Information
                  </h2>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {off?.address && (
                      <li className="flex items-start gap-3 text-gray-700">
                        <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{off.address}</span>
                      </li>
                    )}
                    {off?.phone && (
                      <li className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <a href={`tel:${off.phone}`} className="text-sm text-gray-700 hover:text-blue-600">{off.phone}</a>
                      </li>
                    )}
                    {off?.email && (
                      <li className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <a href={`mailto:${off.email}`} className="text-sm text-gray-700 hover:text-blue-600 break-all">{off.email}</a>
                      </li>
                    )}
                    {off?.website && (
                      <li className="flex items-center gap-3">
                        <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <a href={off.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">{off.website}</a>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Election history */}
            {electionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Election History
                  </h2>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">Year</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">Jurisdiction</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">Votes</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">%</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {electionHistory.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{new Date(row.electionDate).getFullYear()}</td>
                          <td className="px-5 py-3 text-gray-700">{row.jurisdiction}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{row.votesReceived.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{row.percentage.toFixed(1)}%</td>
                          <td className="px-5 py-3 text-center">
                            {row.won ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Won
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Platform */}
            <Card>
              <CardHeader><h2 className="text-xl font-semibold">Platform &amp; Pledges</h2></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: "Sustainable Transportation", desc: "Invest in bike lanes and public transit improvements." },
                    { title: "Affordable Housing", desc: "Create more affordable housing options for families." },
                    { title: "Community Safety", desc: "Improve lighting and community policing programmes." },
                  ].map((p) => (
                    <div key={p.title} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold">{p.title}</h3>
                        <p className="text-gray-600">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Polls */}
            {polls.length > 0 && (
              <Card>
                <CardHeader><h2 className="text-xl font-semibold">Live Polls</h2></CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {polls.map((poll) => (
                      <div key={poll.id}>
                        <h3 className="font-semibold mb-4">{poll.question}</h3>
                        <div className="space-y-2">
                          {poll.options.map((option) => (
                            <div key={option.id}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{option.text}</span>
                                <span className="text-gray-500">{option.percentage}% ({option.count})</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${option.percentage}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Events */}
            <Card>
              <CardHeader><h2 className="text-xl font-semibold">Upcoming Events</h2></CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Community Meet &amp; Greet</h3>
                    <p className="text-gray-600 text-sm">Join us for coffee and conversation</p>
                    <p className="text-sm text-gray-500 mt-1">Saturday, May 15 · 10:00 AM · Community Centre, Main St</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{campaign.supporterCount.toLocaleString()}</div>
                <div className="text-gray-500 text-sm">Supporters</div>
                {off?.isClaimed && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Official Profile
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-lg font-semibold">Join Our Team</h3></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); post(`/api/public/candidates/${campaign.slug}/volunteer`, volunteerForm, () => setVolunteerForm({ name: "", email: "", phone: "", message: "" })); }} className="space-y-3">
                  <input type="text" placeholder="Your name" value={volunteerForm.name} onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="email" placeholder="Email" value={volunteerForm.email} onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="tel" placeholder="Phone (optional)" value={volunteerForm.phone} onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  <textarea placeholder="Message (optional)" value={volunteerForm.message} onChange={(e) => setVolunteerForm({ ...volunteerForm, message: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Submitting…" : "Volunteer"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-lg font-semibold">Request a Lawn Sign</h3></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); post(`/api/public/candidates/${campaign.slug}/sign-request`, signForm, () => setSignForm({ address: "", name: "", email: "" })); }} className="space-y-3">
                  <input type="text" placeholder="Your address" value={signForm.address} onChange={(e) => setSignForm({ ...signForm, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="text" placeholder="Your name" value={signForm.name} onChange={(e) => setSignForm({ ...signForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="email" placeholder="Email" value={signForm.email} onChange={(e) => setSignForm({ ...signForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Submitting…" : "Request Sign"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-lg font-semibold">Show Your Support</h3></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); post(`/api/public/candidates/${campaign.slug}/support`, supportForm, () => setSupportForm({ name: "", email: "", householdCount: 1 })); }} className="space-y-3">
                  <input type="text" placeholder="Your name" value={supportForm.name} onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="email" placeholder="Email" value={supportForm.email} onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <select value={supportForm.householdCount} onChange={(e) => setSupportForm({ ...supportForm, householdCount: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>)}
                  </select>
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Submitting…" : "I Support"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-lg font-semibold">Ask a Question</h3></CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); post(`/api/public/candidates/${campaign.slug}/question`, questionForm, () => setQuestionForm({ name: "", email: "", question: "" })); }} className="space-y-3">
                  <input type="text" placeholder="Your name" value={questionForm.name} onChange={(e) => setQuestionForm({ ...questionForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <input type="email" placeholder="Email" value={questionForm.email} onChange={(e) => setQuestionForm({ ...questionForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                  <textarea placeholder="Your question" value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} required />
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Submitting…" : "Submit Question"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-lg font-semibold">Share This Page</h3></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => navigator.share?.({ title: campaign.candidateName ?? "Candidate", url: shareUrl })}>
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); }}>
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-400 text-center">
              Powered by <a href="https://poll.city" className="text-blue-500 hover:underline font-medium">poll.city</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
