"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
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

interface Municipality { name: string; province: string | null }
interface Ward { name: string; municipality: string }
interface MatchedOfficial {
  id: string; name: string; title: string; district: string;
  level: string; isClaimed: boolean; photoUrl: string | null;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", electionType: "municipal", jurisdiction: "",
    electionDate: "", candidateName: "", partyName: "",
  });
  const [saving, setSaving] = useState(false);

  // Geo state
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [selectedWard, setSelectedWard] = useState("");
  const [hasElectionData, setHasElectionData] = useState(false);
  const [loadingElectionData, setLoadingElectionData] = useState(false);

  // Official matching
  const [matchedOfficial, setMatchedOfficial] = useState<MatchedOfficial | null>(null);
  const [checkingOfficial, setCheckingOfficial] = useState(false);
  const [officialDismissed, setOfficialDismissed] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Load municipalities when election type is municipal
  useEffect(() => {
    if (form.electionType !== "municipal") {
      setMunicipalities([]);
      setSelectedMunicipality("");
      return;
    }
    setLoadingMunicipalities(true);
    fetch("/api/geo/municipalities?province=ON")
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setMunicipalities(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMunicipalities(false));
  }, [form.electionType]);

  // Check for election data when municipality is selected
  useEffect(() => {
    if (!selectedMunicipality) {
      setHasElectionData(false);
      return;
    }
    setLoadingElectionData(true);
    fetch(`/api/analytics/election-results?jurisdiction=${encodeURIComponent(selectedMunicipality)}&limit=1`)
      .then(r => r.ok ? r.json() : { data: { total: 0 } })
      .then(d => setHasElectionData((d.data?.total ?? 0) > 0))
      .catch(() => setHasElectionData(false))
      .finally(() => setLoadingElectionData(false));
  }, [selectedMunicipality]);

  // Auto-fill jurisdiction when municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      set("jurisdiction", selectedMunicipality);
    }
  }, [selectedMunicipality]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search for matching official when candidateName is entered
  useEffect(() => {
    if (!form.candidateName || form.candidateName.length < 3 || officialDismissed) {
      setMatchedOfficial(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingOfficial(true);
      try {
        const res = await fetch(`/api/officials?search=${encodeURIComponent(form.candidateName)}&limit=1`);
        if (res.ok) {
          const d = await res.json();
          const first = d.data?.[0] ?? null;
          setMatchedOfficial(first);
          setOfficialDismissed(false);
        }
      } catch { /* non-critical */ }
      finally { setCheckingOfficial(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [form.candidateName, officialDismissed]);

  function claimOfficial() {
    if (!matchedOfficial) return;
    set("candidateName", matchedOfficial.name);
    set("jurisdiction", matchedOfficial.district);
    if (!form.name) set("name", `${matchedOfficial.name} — ${matchedOfficial.district}`);
    setSelectedMunicipality(matchedOfficial.district);
    toast.success("Profile data pre-filled from official record");
    setOfficialDismissed(true);
  }

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
          officialId: matchedOfficial && !officialDismissed ? matchedOfficial.id : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
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

      {/* Official match banner */}
      {matchedOfficial && !officialDismissed && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          {matchedOfficial.isClaimed ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              We found your profile — claim it
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              <strong>{matchedOfficial.name}</strong> · {matchedOfficial.title} · {matchedOfficial.district}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={claimOfficial}
              className="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Use this profile
            </button>
            <button
              onClick={() => setOfficialDismissed(true)}
              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

          {/* Municipality dropdown for municipal elections */}
          {form.electionType === "municipal" && (
            <>
              <FormField label="Municipality">
                {loadingMunicipalities ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading municipalities…
                  </div>
                ) : (
                  <Select
                    value={selectedMunicipality}
                    onChange={e => setSelectedMunicipality(e.target.value)}
                  >
                    <option value="">Select a municipality…</option>
                    {municipalities.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </Select>
                )}
              </FormField>

              {/* Election data message */}
              {selectedMunicipality && (
                <div className={`p-3 rounded-lg text-sm ${
                  hasElectionData
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}>
                  {loadingElectionData ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking election data…
                    </div>
                  ) : hasElectionData ? (
                    "✓ We have election data for this municipality from 2022"
                  ) : (
                    "No election data available for this municipality yet"
                  )}
                </div>
              )}
            </>
          )}

          <FormField label="Jurisdiction">
            <Input value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)}
              placeholder="Ward 12 — Toronto" />
          </FormField>

          <FormField label="Candidate Name">
            <div className="relative">
              <Input
                value={form.candidateName}
                onChange={e => {
                  set("candidateName", e.target.value);
                  setOfficialDismissed(false);
                }}
                placeholder="Jane Smith"
              />
              {checkingOfficial && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </FormField>

          <FormField label="Party or Organisation">
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
