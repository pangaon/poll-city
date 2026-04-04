"use client";
import { useState } from "react";
import { PageHeader, Card, CardHeader, CardContent, FormField, Input, Button, Select, Badge } from "@/components/ui";
import { toast } from "sonner";

interface Props {
  campaign: { id: string; name: string; slug: string; candidateName: string | null; candidateEmail: string | null; candidatePhone: string | null; primaryColor: string; electionType: string; jurisdiction: string | null; electionDate: string | null };
  user: { id: string; name: string | null; email: string; phone: string | null; role: string };
  userRole: string;
}

export default function SettingsClient({ campaign, user, userRole }: Props) {
  const [profile, setProfile] = useState({ name: user.name ?? "", phone: user.phone ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (res.ok) toast.success("Profile updated");
      else toast.error("Failed to update profile");
    } finally { setSavingProfile(false); }
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <PageHeader title="Settings" />

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

      {/* Campaign Info */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">Campaign</h3></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["Campaign Name", campaign.name],
              ["Slug", campaign.slug],
              ["Election Type", campaign.electionType],
              ["Jurisdiction", campaign.jurisdiction ?? "—"],
              ["Candidate", campaign.candidateName ?? "—"],
              ["Candidate Email", campaign.candidateEmail ?? "—"],
              ["Candidate Phone", campaign.candidatePhone ?? "—"],
              ["Election Date", campaign.electionDate ? new Date(campaign.electionDate).toLocaleDateString() : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-gray-900 truncate">{value}</p>
              </div>
            ))}
          </div>
          {["ADMIN", "SUPER_ADMIN"].includes(userRole) && (
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">Campaign settings editing available for admins via API or database panel.</p>
          )}
        </CardContent>
      </Card>

      {/* Environment info */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">System</h3></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>AI Assist</span><Badge variant={process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "success" : "default"}>{process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "Live" : "Demo mode"}</Badge></div>
          <div className="flex justify-between"><span>Version</span><span className="text-gray-400">Poll City v0.1.0</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
