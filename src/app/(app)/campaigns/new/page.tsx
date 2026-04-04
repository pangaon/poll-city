"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight } from "lucide-react";
import { Button, Card, CardContent, FormField, Input, Select } from "@/components/ui";
import { toast } from "sonner";

const ELECTION_TYPES = [
  { value: "municipal", label: "Municipal" },
  { value: "provincial", label: "Provincial" },
  { value: "federal", label: "Federal" },
  { value: "by_election", label: "By-Election" },
  { value: "nomination", label: "Nomination Race" },
  { value: "leadership", label: "Leadership Race" },
  { value: "union", label: "Union Vote" },
  { value: "referendum", label: "Referendum" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", electionType: "municipal", jurisdiction: "",
    electionDate: "", candidateName: "", partyName: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name || !form.electionType) {
      toast.error("Campaign name and election type are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          electionDate: form.electionDate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Switch to the new campaign
        await fetch("/api/campaigns/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: data.data.id }),
        });
        toast.success("Campaign created!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error ?? "Failed to create campaign");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Create New Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">Set up a new campaign. You can invite team members after.</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-5">
          <FormField label="Campaign Name" required>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Jane Smith for Mayor 2026" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Election Type" required>
              <Select value={form.electionType} onChange={e => set("electionType", e.target.value)}>
                {ELECTION_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Election Date">
              <Input type="date" value={form.electionDate} onChange={e => set("electionDate", e.target.value)} />
            </FormField>
          </div>
          <FormField label="Jurisdiction">
            <Input value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)}
              placeholder="Ward 12 — Toronto" />
          </FormField>
          <FormField label="Candidate Name">
            <Input value={form.candidateName} onChange={e => set("candidateName", e.target.value)}
              placeholder="Jane Smith" />
          </FormField>
          <FormField label="Party or Organization">
            <Input value={form.partyName} onChange={e => set("partyName", e.target.value)}
              placeholder="Independent / Liberal / etc." />
          </FormField>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
            <Button onClick={submit} loading={saving} className="flex-1">
              Create Campaign <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
