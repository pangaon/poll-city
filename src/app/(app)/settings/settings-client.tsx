"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PageHeader, Card, CardHeader, CardContent, FormField, Input, Button, Badge,
} from "@/components/ui";
import {
  SlidersHorizontal, Palette, Users, Globe, Shield, Lock, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

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
];

export default function SettingsClient({ campaign, user, userRole }: Props) {
  const [profile, setProfile] = useState({ name: user.name ?? "", phone: user.phone ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const isAiEnabled = (process.env.NEXT_PUBLIC_AI_ENABLED ?? "false") === "true";

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
      <PageHeader title="Settings" description="Manage your campaign environment and personal preferences" />

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
          <FormField label="Full Name">
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" />
          </FormField>
          <FormField label="Email">
            <Input value={user.email} disabled className="opacity-60" />
          </FormField>
          <FormField label="Phone">
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
                <FormField label="Campaign Name">
                  <Input
                    value={campaignProfile.name}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, name: e.target.value })}
                    placeholder="Campaign name"
                  />
                </FormField>
                <FormField label="Candidate Name">
                  <Input
                    value={campaignProfile.candidateName}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateName: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </FormField>
                <FormField label="Candidate Title">
                  <Input
                    value={campaignProfile.candidateTitle}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateTitle: e.target.value })}
                    placeholder="Councillor, Ward 3"
                  />
                </FormField>
                <FormField label="Candidate Email">
                  <Input
                    value={campaignProfile.candidateEmail}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateEmail: e.target.value })}
                    placeholder="jane@campaign.ca"
                    type="email"
                  />
                </FormField>
                <FormField label="Candidate Phone">
                  <Input
                    value={campaignProfile.candidatePhone}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, candidatePhone: e.target.value })}
                    placeholder="416-555-0100"
                    type="tel"
                  />
                </FormField>
                <FormField label="Election Type">
                  <Input
                    value={campaignProfile.electionType}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, electionType: e.target.value })}
                    placeholder="municipal"
                  />
                </FormField>
                <FormField label="Jurisdiction">
                  <Input
                    value={campaignProfile.jurisdiction}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, jurisdiction: e.target.value })}
                    placeholder="Ward 3, Toronto"
                  />
                </FormField>
                <FormField label="Election Date">
                  <Input
                    value={campaignProfile.electionDate}
                    onChange={(e) => setCampaignProfile({ ...campaignProfile, electionDate: e.target.value })}
                    type="date"
                  />
                </FormField>
              </div>
              <FormField label="Candidate Bio">
                <textarea
                  value={campaignProfile.candidateBio}
                  onChange={(e) => setCampaignProfile({ ...campaignProfile, candidateBio: e.target.value })}
                  placeholder="A few sentences about the candidate..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{campaignProfile.candidateBio.length}/1000</p>
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

      {/* System */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">System</h3></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>AI Assist</span>
            <Badge variant={isAiEnabled ? "success" : "default"}>{isAiEnabled ? "Live" : "Demo mode"}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
