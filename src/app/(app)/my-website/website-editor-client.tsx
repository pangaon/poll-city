"use client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ExternalLink, Eye, GripVertical, Save, Globe, Image as ImageIcon, User, Layers, Quote, HelpCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformItem { id: string; title: string; summary: string; details: string; order: number; }
interface Endorsement { id: string; name: string; role: string; quote: string; photoUrl?: string; }
interface FaqItem { id: string; q: string; a: string; }

interface Campaign {
  id: string;
  slug: string | null;
  candidateName: string | null;
  candidateTitle: string | null;
  candidateBio: string | null;
  tagline: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  primaryColor: string | null;
  isPublic: boolean;
  customization: unknown;
}

function cx(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
}

const TABS = [
  { id: "profile",      label: "Profile",     icon: User    },
  { id: "photos",       label: "Photos",      icon: ImageIcon },
  { id: "platform",     label: "Platform",    icon: Layers  },
  { id: "endorsements", label: "Endorsements",icon: Quote   },
  { id: "faq",          label: "FAQ",         icon: HelpCircle },
  { id: "social",       label: "Social Links",icon: Share2  },
] as const;

type Tab = typeof TABS[number]["id"];

export default function WebsiteEditorClient({ campaign }: { campaign: Campaign }) {
  const custom = cx(campaign.customization);

  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [candidateName, setCandidateName] = useState(campaign.candidateName ?? "");
  const [candidateTitle, setCandidateTitle] = useState(campaign.candidateTitle ?? "");
  const [candidateBio, setCandidateBio] = useState(campaign.candidateBio ?? "");
  const [tagline, setTagline] = useState(campaign.tagline ?? "");
  const [yearsInCommunity, setYearsInCommunity] = useState(
    typeof custom.yearsInCommunity === "number" ? String(custom.yearsInCommunity) : ""
  );
  const [communityConnections, setCommunityConnections] = useState(
    Array.isArray(custom.communityConnections)
      ? (custom.communityConnections as string[]).join("\n")
      : ""
  );

  // Photos
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState(
    typeof custom.candidatePhotoUrl === "string" ? custom.candidatePhotoUrl : ""
  );
  const [heroBannerUrl, setHeroBannerUrl] = useState(
    typeof custom.heroBannerUrl === "string" ? custom.heroBannerUrl : ""
  );
  const [videoUrl, setVideoUrl] = useState(
    typeof custom.videoUrl === "string" ? custom.videoUrl : ""
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Platform items
  const [platformItems, setPlatformItems] = useState<PlatformItem[]>(() => {
    const items = Array.isArray(custom.platformItems) ? custom.platformItems : [];
    return (items as Record<string, unknown>[])
      .filter(i => i && typeof i === "object")
      .map((i, idx) => ({
        id: typeof i.id === "string" ? i.id : `issue-${idx}`,
        title: typeof i.title === "string" ? i.title : "",
        summary: typeof i.summary === "string" ? i.summary : "",
        details: typeof i.details === "string" ? i.details : "",
        order: typeof i.order === "number" ? i.order : idx,
      }));
  });

  // Endorsements
  const [endorsements, setEndorsements] = useState<Endorsement[]>(() => {
    const items = Array.isArray(custom.endorsements) ? custom.endorsements : [];
    return (items as Record<string, unknown>[])
      .filter(i => i && typeof i === "object")
      .map((i, idx) => ({
        id: typeof i.id === "string" ? i.id : `end-${idx}`,
        name: typeof i.name === "string" ? i.name : "",
        role: typeof i.role === "string" ? i.role : "",
        quote: typeof i.quote === "string" ? i.quote : "",
        photoUrl: typeof i.photoUrl === "string" ? i.photoUrl : undefined,
      }));
  });

  // FAQ
  const [faqs, setFaqs] = useState<FaqItem[]>(() => {
    const items = Array.isArray(custom.customFaq) ? custom.customFaq : [];
    return (items as Record<string, unknown>[])
      .filter(i => i && typeof i === "object")
      .map((i, idx) => ({
        id: typeof i.id === "string" ? i.id : `faq-${idx}`,
        q: typeof i.q === "string" ? i.q : "",
        a: typeof i.a === "string" ? i.a : "",
      }));
  });

  // Social
  const [websiteUrl, setWebsiteUrl] = useState(campaign.websiteUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(campaign.facebookUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(campaign.instagramHandle ?? "");
  const [twitterHandle, setTwitterHandle] = useState(campaign.twitterHandle ?? "");

  async function uploadImage(file: File, type: "candidate-photo" | "hero-banner") {
    if (!file.type.startsWith("image/")) { toast.error("Must be an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return; }
    const setter = type === "candidate-photo" ? setUploadingPhoto : setUploadingBanner;
    setter(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadType", type);
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "x-campaign-id": campaign.id },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      if (type === "candidate-photo") setCandidatePhotoUrl(data.url);
      else setHeroBannerUrl(data.url);
      toast.success("Photo uploaded — click Save to apply");
    } finally {
      setter(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        candidateName: candidateName.trim(),
        candidateTitle: candidateTitle.trim(),
        candidateBio: candidateBio.trim(),
        tagline: tagline.trim(),
        candidatePhotoUrl: candidatePhotoUrl.trim(),
        heroBannerUrl: heroBannerUrl.trim(),
        videoUrl: videoUrl.trim(),
        yearsInCommunity: yearsInCommunity ? parseInt(yearsInCommunity, 10) : undefined,
        communityConnections: communityConnections.split("\n").map(s => s.trim()).filter(Boolean),
        platformItems,
        endorsements,
        customFaq: faqs,
        websiteUrl: websiteUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        instagramHandle: instagramHandle.trim(),
        twitterHandle: twitterHandle.trim(),
      };
      const res = await fetch(`/api/campaigns/${campaign.id}/customization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Save failed");
        return;
      }
      toast.success("Website updated — changes are live");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = campaign.slug ? `https://poll.city/candidates/${campaign.slug}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              My Campaign Website
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {campaign.isPublic ? (
                <span className="text-green-600 font-medium">● Live</span>
              ) : (
                <span className="text-amber-600 font-medium">● Draft</span>
              )}
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1">
                  {publicUrl.replace("https://", "")} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                <Eye className="w-4 h-4" /> Preview
              </a>
            )}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center",
                  tab === t.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                )}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Profile Information</h2>
            <Field label="Your Name" hint="As it appears on your website">
              <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className={INPUT} placeholder="e.g. Maleeha Shahid" />
            </Field>
            <Field label="Title / Office" hint="The office you're running for">
              <input value={candidateTitle} onChange={e => setCandidateTitle(e.target.value)}
                className={INPUT} placeholder="e.g. Regional Councillor, East Ward 4" />
            </Field>
            <Field label="Tagline" hint="One powerful sentence — the top of your homepage">
              <input value={tagline} onChange={e => setTagline(e.target.value)}
                className={INPUT} placeholder="e.g. Fighting for a healthier, stronger Whitby" />
            </Field>
            <Field label="About You" hint="2–4 paragraphs. Tell voters who you are and why you're running.">
              <textarea value={candidateBio} onChange={e => setCandidateBio(e.target.value)}
                rows={6} className={INPUT} placeholder="Share your story, your community ties, and your commitment to voters…" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Years in Community">
                <input type="number" value={yearsInCommunity} onChange={e => setYearsInCommunity(e.target.value)}
                  className={INPUT} placeholder="e.g. 15" min={0} max={99} />
              </Field>
            </div>
            <Field label="Community Ties" hint="One per line — shown as highlights on your site">
              <textarea value={communityConnections} onChange={e => setCommunityConnections(e.target.value)}
                rows={4} className={INPUT} placeholder={"Parent of Whitby school children\n15+ years East Whitby resident\nFormer PTA member"} />
            </Field>
          </div>
        )}

        {/* Photos Tab */}
        {tab === "photos" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="font-semibold text-gray-900">Photos & Media</h2>

            {/* Candidate photo */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Candidate Photo</label>
              <p className="text-xs text-gray-400">Your headshot — appears prominently on the homepage. Square or portrait, min 400×400px.</p>
              <div className="flex gap-4 items-start">
                {candidatePhotoUrl ? (
                  <img src={candidatePhotoUrl} alt="Candidate" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <button onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60">
                    <Upload className="w-4 h-4" />
                    {uploadingPhoto ? "Uploading…" : "Upload Photo"}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, "candidate-photo"); e.target.value = ""; }} />
                  <p className="text-xs text-gray-400">Or paste a URL:</p>
                  <input value={candidatePhotoUrl} onChange={e => setCandidatePhotoUrl(e.target.value)}
                    className={INPUT} placeholder="https://…" />
                </div>
              </div>
            </div>

            {/* Hero banner */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Hero Banner</label>
              <p className="text-xs text-gray-400">The full-width background image on your homepage. Landscape, min 1400×600px. Dark images work best.</p>
              <div className="space-y-2">
                {heroBannerUrl && (
                  <img src={heroBannerUrl} alt="Hero banner" className="w-full h-32 rounded-xl object-cover border border-gray-200" />
                )}
                <button onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60">
                  <Upload className="w-4 h-4" />
                  {uploadingBanner ? "Uploading…" : "Upload Banner"}
                </button>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, "hero-banner"); e.target.value = ""; }} />
                <p className="text-xs text-gray-400">Or paste a URL:</p>
                <input value={heroBannerUrl} onChange={e => setHeroBannerUrl(e.target.value)}
                  className={INPUT} placeholder="https://…" />
              </div>
            </div>

            {/* Video */}
            <Field label="Campaign Video (optional)" hint="YouTube or Vimeo URL — shown on your homepage">
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                className={INPUT} placeholder="https://www.youtube.com/watch?v=…" />
            </Field>
          </div>
        )}

        {/* Platform Tab */}
        {tab === "platform" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Platform Priorities</h2>
                <p className="text-sm text-gray-500">The issues that define your campaign. Aim for 3–5.</p>
              </div>
              <button onClick={() => setPlatformItems(prev => [...prev, {
                id: `issue-${Date.now()}`, title: "", summary: "", details: "", order: prev.length
              }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add Issue
              </button>
            </div>
            {platformItems.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No platform issues yet. Click &ldquo;Add Issue&rdquo; to start.</p>
              </div>
            )}
            {platformItems.map((item, idx) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="text-xs font-semibold text-gray-400 uppercase">Issue {idx + 1}</span>
                  </div>
                  <button onClick={() => setPlatformItems(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input value={item.title}
                  onChange={e => setPlatformItems(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))}
                  className={INPUT} placeholder="Issue title, e.g. A New Whitby Hospital" />
                <input value={item.summary}
                  onChange={e => setPlatformItems(prev => prev.map((p, i) => i === idx ? { ...p, summary: e.target.value } : p))}
                  className={INPUT} placeholder="One-line summary for voters" />
                <textarea value={item.details}
                  onChange={e => setPlatformItems(prev => prev.map((p, i) => i === idx ? { ...p, details: e.target.value } : p))}
                  rows={3} className={INPUT} placeholder="Full description — what you'll do and why it matters…" />
              </div>
            ))}
          </div>
        )}

        {/* Endorsements Tab */}
        {tab === "endorsements" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Endorsements</h2>
                <p className="text-sm text-gray-500">Community leaders, organizations, or neighbours who support your campaign.</p>
              </div>
              <button onClick={() => setEndorsements(prev => [...prev, {
                id: `end-${Date.now()}`, name: "", role: "", quote: ""
              }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add Endorsement
              </button>
            </div>
            {endorsements.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Quote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No endorsements yet. Click &ldquo;Add Endorsement&rdquo; to start.</p>
              </div>
            )}
            {endorsements.map((item, idx) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Endorsement {idx + 1}</span>
                  <button onClick={() => setEndorsements(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={item.name}
                    onChange={e => setEndorsements(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                    className={INPUT} placeholder="Name, e.g. Jane Smith" />
                  <input value={item.role}
                    onChange={e => setEndorsements(prev => prev.map((p, i) => i === idx ? { ...p, role: e.target.value } : p))}
                    className={INPUT} placeholder="Title, e.g. Whitby Business Owner" />
                </div>
                <textarea value={item.quote}
                  onChange={e => setEndorsements(prev => prev.map((p, i) => i === idx ? { ...p, quote: e.target.value } : p))}
                  rows={2} className={INPUT} placeholder="Their endorsement quote…" />
              </div>
            ))}
          </div>
        )}

        {/* FAQ Tab */}
        {tab === "faq" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">FAQ &mdash; &ldquo;Because You Asked&rdquo;</h2>
                <p className="text-sm text-gray-500">Questions voters ask most. Honest answers build trust.</p>
              </div>
              <button onClick={() => setFaqs(prev => [...prev, { id: `faq-${Date.now()}`, q: "", a: "" }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
            {faqs.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No FAQs yet. Click &ldquo;Add Question&rdquo; to start.</p>
              </div>
            )}
            {faqs.map((item, idx) => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Q&amp;A {idx + 1}</span>
                  <button onClick={() => setFaqs(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input value={item.q}
                  onChange={e => setFaqs(prev => prev.map((p, i) => i === idx ? { ...p, q: e.target.value } : p))}
                  className={INPUT} placeholder="Question voters ask, e.g. Why did you vote for…?" />
                <textarea value={item.a}
                  onChange={e => setFaqs(prev => prev.map((p, i) => i === idx ? { ...p, a: e.target.value } : p))}
                  rows={3} className={INPUT} placeholder="Your honest, direct answer…" />
              </div>
            ))}
          </div>
        )}

        {/* Social Tab */}
        {tab === "social" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Social Links</h2>
            <Field label="Campaign Website (external)">
              <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                className={INPUT} placeholder="https://maleehashahid.ca" />
            </Field>
            <Field label="Facebook Page URL">
              <input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                className={INPUT} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram Handle" hint="Without the @">
              <input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)}
                className={INPUT} placeholder="maleehashahid" />
            </Field>
            <Field label="Twitter / X Handle" hint="Without the @">
              <input value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)}
                className={INPUT} placeholder="maleehashahid" />
            </Field>
          </div>
        )}

        {/* Sticky save bar on mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center sm:hidden z-50">
          <span className="text-sm text-gray-500">{campaign.isPublic ? "● Live" : "● Draft"}</span>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

const INPUT = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none";
