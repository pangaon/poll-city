"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PageHeader, Card, CardHeader, CardContent, FormField, Input, Button, Badge,
} from "@/components/ui";
import {
  SlidersHorizontal, Palette, Users, Globe, Shield, Lock, ChevronRight,
  CreditCard, Mail, MessageSquare, Sparkles, Database, Bell, CheckCircle2, XCircle, AlertTriangle, BellOff,
} from "lucide-react";
import { toast } from "sonner";

interface Integrations {
  stripe: boolean;
  resend: boolean;
  twilio: boolean;
  anthropic: boolean;
  upstash: boolean;
  vapid: boolean;
}

interface Props {
  campaign: {
    id: string; name: string; slug: string;
    candidateName: string | null; candidateTitle: string | null;
    candidateBio: string | null; candidateEmail: string | null;
    candidatePhone: string | null; primaryColor: string;
    electionType: string; jurisdiction: string | null; electionDate: Date | null;
  };
  user: { id: string; name: string | null; email: string; phone: string | null; avatarUrl: string | null };
  userRole: string;
  integrations: Integrations;
}

const SETTINGS_SECTIONS = [
  {
    href: "/settings/fields",
    label: "Fields",
    description: "Configure which fields appear on canvassing cards and the contacts table",
    icon: SlidersHorizontal,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/settings/brand",
    label: "Brand",
    description: "Campaign colors, logo, and visual identity",
    icon: Palette,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/settings/team",
    label: "Team",
    description: "Invite members, assign roles, manage permissions",
    icon: Users,
    color: "bg-purple-50 text-purple-600",
  },
  {
    href: "/settings/public-page",
    label: "Public Page",
    description: "Your campaign's public-facing page and candidate profile",
    icon: Globe,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/settings/permissions",
    label: "Permissions",
    description: "Role-based access control, create custom roles, Adoni access matrix",
    icon: Shield,
    color: "bg-red-50 text-red-600",
  },
  {
    href: "/settings/security",
    label: "Security",
    description: "Two-factor authentication, sessions, and access controls",
    icon: Lock,
    color: "bg-slate-50 text-slate-600",
  },
  {
    href: "/settings/billing",
    label: "Billing",
    description: "Subscription plan, payment method, and invoices",
    icon: CreditCard,
    color: "bg-sky-50 text-sky-600",
  },
  {
    href: "/settings/comms-limits",
    label: "Comms Limits",
    description: "Cooldown window, weekly and monthly message frequency caps",
    icon: BellOff,
    color: "bg-orange-50 text-orange-600",
  },
];

export default function SettingsClient({ campaign, user, userRole, integrations }: Props) {
  const [profile, setProfile] = useState({ name: user.name ?? "", phone: user.phone ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [campaignProfile, setCampaignProfile] = useState({
    name: campaign.name,
    candidateName: campaign.candidateName ?? "",
    candidateTitle: campaign.candidateTitle ?? "",
    candidateBio: campaign.candidateBio ?? "",
    candidateEmail: campaign.candidateEmail ?? "",
    candidatePhone: campaign.candidatePhone ?? "",
    electionType: campaign.electionType,
    jurisdiction: campaign.jurisdiction ?? "",
    electionDate: campaign.electionDate
      ? new Date(campaign.electionDate).toISOString().slice(0, 10)
      : "",
  });
  const [savingCampaign, setSavingCampaign] = useState(false);
  const canEditCampaign = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) toast.success("Profile updated");
      else toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveCampaignProfile() {
    setSavingCampaign(true);
    try {
      const res = await fetch("/api/campaigns/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, ...campaignProfile }),
      });
      if (res.ok) toast.success("Campaign profile updated");
      else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update campaign profile");
      }
    } finally {
      setSavingCampaign(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <PageHeader title="Settings" description="Campaign settings and personal preferences" />

      {/* Settings navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="group">
            <Card className="h-full hover:shadow-md transition-shadow duration-200">
              <CardContent className="py-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${section.color}`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0A2342]">{section.label}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1D9E75] transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* My Profile */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">My Profile</h3></CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="Full Name"
            help={{ content: "Your name as it appears to other team members in this campaign." }}
          >
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" />
          </FormField>
          <FormField
            label="Email"
            help={{ content: "Your sign-in email address. Contact support to change this." }}
          >
            <Input value={user.email} disabled className="opacity-60" />
          </FormField>
          <FormField
            label="Phone"
            help={{ content: "Your personal contact number. Used for two-factor authentication and team communications.", example: "416-555-0100" }}
          >
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="416-555-0100" type="tel" />
          </FormField>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Role:</span>
            <Badge variant="info">{userRole.replace("_", " ")}</Badge>
          </div>
          <Button onClick={saveProfile} loading={savingProfile}>Save Profile</Button>
        </CardContent>
      </Card>

      {/* Campaign Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Campaign Profile</h3>
            <span className="text-xs text-gray-400">Slug: {campaign.slug}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditCampaign ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Campaign Name"
                  help={{
                    content: "Your official campaign name. Appears on all communications and your public Poll City profile.",
                    example: "Jane Smith for Ward 3 — 2026",
                  }}
                >
                  <Input
                    value={campaignProfile.name}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, name: e.target.value })}
                    placeholder="Jane Smith for Ward 3 — 2026"
                  />
                </FormField>
                <FormField
                  label="Candidate Name"
                  help={{ content: "The candidate's full name as it appears on the ballot." }}
                >
                  <Input
                    value={campaignProfile.candidateName}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateName: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </FormField>
                <FormField
                  label="Candidate Title"
                  help={{ content: "The position being sought. Shown on your public profile.", example: "Councillor, Ward 3 or MPP for Ottawa Centre" }}
                >
                  <Input
                    value={campaignProfile.candidateTitle}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateTitle: e.target.value })}
                    placeholder="Councillor, Ward 3"
                  />
                </FormField>
                <FormField
                  label="Candidate Email"
                  help={{ content: "The public contact email for the campaign. Shown on the candidate's public profile.", example: "jane@campaign.ca" }}
                >
                  <Input
                    value={campaignProfile.candidateEmail}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateEmail: e.target.value })}
                    placeholder="jane@campaign.ca"
                    type="email"
                  />
                </FormField>
                <FormField
                  label="Candidate Phone"
                  help={{ content: "The public contact phone number for the campaign.", example: "416-555-0100" }}
                >
                  <Input
                    value={campaignProfile.candidatePhone}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidatePhone: e.target.value })}
                    placeholder="416-555-0100"
                    type="tel"
                  />
                </FormField>
                <FormField
                  label="Election Type"
                  help={{ content: "The level of government this campaign is for.", example: "municipal, provincial, federal" }}
                >
                  <Input
                    value={campaignProfile.electionType}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, electionType: e.target.value })}
                    placeholder="municipal"
                  />
                </FormField>
                <FormField
                  label="Jurisdiction"
                  help={{
                    content: "The ward, riding, or district you are running in. Used to scope your canvassing data and public profile.",
                    example: "Ward 3, Toronto",
                  }}
                >
                  <Input
                    value={campaignProfile.jurisdiction}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, jurisdiction: e.target.value })}
                    placeholder="Ward 3, Toronto"
                  />
                </FormField>
                <FormField
                  label="Election Date"
                  help={{ content: "The official voting day. Drives your canvassing countdown and GOTV priorities." }}
                >
                  <Input
                    value={campaignProfile.electionDate}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, electionDate: e.target.value })}
                    type="date"
                  />
                </FormField>
              </div>
              <FormField
                label="Candidate Bio"
                help={{
                  content: "A short biography of the candidate. Shown on the public profile. Write in the third person.",
                  example: "Jane Smith is a community advocate running for Ward 3 Councillor...",
                }}
                hint={`${campaignProfile.candidateBio.length}/1000 characters`}
              >
                <textarea
                  value={campaignProfile.candidateBio}
                  onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateBio: e.target.value })}
                  placeholder="A few sentences about the candidate — who they are and why they are running..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </FormField>
              <Button onClick={saveCampaignProfile} loading={savingCampaign}>
                Save Campaign Profile
              </Button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([
                ["Campaign Name", campaign.name],
                ["Candidate", campaign.candidateName ?? "\u2014"],
                ["Candidate Email", campaign.candidateEmail ?? "\u2014"],
                ["Candidate Phone", campaign.candidatePhone ?? "\u2014"],
                ["Election Type", campaign.electionType],
                ["Jurisdiction", campaign.jurisdiction ?? "\u2014"],
                ["Election Date", campaign.electionDate ? new Date(campaign.electionDate).toLocaleDateString() : "\u2014"],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-gray-900 truncate">{value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <Link href="/ops" className="text-xs text-blue-600 hover:underline">Manage in Ops →</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "stripe" as const, label: "Stripe", description: "Donations + subscriptions", icon: CreditCard, setupNote: "Add STRIPE_SECRET_KEY to Vercel" },
              { key: "resend" as const, label: "Email (Resend)", description: "Email blasts + receipts", icon: Mail, setupNote: "Add RESEND_API_KEY to Vercel" },
              { key: "twilio" as const, label: "SMS (Twilio)", description: "SMS blasts + opt-outs", icon: MessageSquare, setupNote: "Add TWILIO_ACCOUNT_SID to Vercel" },
              { key: "anthropic" as const, label: "Adoni AI", description: "Campaign intelligence", icon: Sparkles, setupNote: "Add ANTHROPIC_API_KEY to Vercel" },
              { key: "upstash" as const, label: "Rate Limiting", description: "Redis-backed rate limits", icon: Database, setupNote: "Add UPSTASH_REDIS_REST_URL to Vercel" },
              { key: "vapid" as const, label: "Push Notifications", description: "Browser push alerts", icon: Bell, setupNote: "Run npx web-push generate-vapid-keys" },
            ] as const).map(({ key, label, description, icon: Icon, setupNote }) => {
              const isActive = integrations[key];
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${isActive ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      {isActive
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                    </div>
                    <p className="text-xs text-gray-500">{description}</p>
                    {!isActive && (
                      <p className="text-xs text-amber-700 mt-0.5">{setupNote}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            See <Link href="/george-todo" className="text-blue-600 underline">GEORGE_TODO.md</Link> for step-by-step setup instructions for each integration.
          </p>
        </CardContent>
      </Card>

      {/* End of Campaign — only shown after election date has passed */}
      {canEditCampaign && campaign.electionDate && new Date(campaign.electionDate) < new Date() && (
        <Card className="border-amber-200 mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Your election has passed</h3>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Your election date was {new Date(campaign.electionDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}. If you are running again or for something else, update your election date in the profile section above and this notice will disappear.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Ready to wrap up this campaign?</p>
              <p className="text-sm text-amber-800 mt-2">
                Archiving closes out this campaign. Here is what happens:
              </p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                <li>Your team loses access immediately</li>
                <li>All your data — contacts, donations, canvassing records — is fully preserved</li>
                <li>Nothing is deleted. It can be restored any time by contacting support</li>
              </ul>
              <p className="text-xs text-amber-700 mt-3">
                Not running again? Archive it. Running again or for something else? Update your election date above instead.
              </p>
              <button
                className="mt-4 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                onClick={() => {
                  const confirmed = window.confirm(
                    `Archive "${campaign.name}"?\n\nYour team will lose access immediately. All data is preserved.\n\nTo restore, email support@poll.city.`
                  );
                  if (confirmed) {
                    toast.info("To archive this campaign, email support@poll.city with your campaign name. We will confirm with you before archiving.");
                  }
                }}
              >
                Archive this campaign
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
