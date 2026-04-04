"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight, AlertCircle, CheckCircle, Loader2, MapPin,
} from "lucide-react";
import {
  Button, Card, CardContent, FormField, Input, Select,
} from "@/components/ui";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PROVINCES = [
  { value: "ON", label: "Ontario" },
  { value: "BC", label: "British Columbia" },
  { value: "AB", label: "Alberta" },
  { value: "QC", label: "Quebec" },
  { value: "MB", label: "Manitoba" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland & Labrador" },
  { value: "PE", label: "Prince Edward Island" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Municipality { name: string; province: string | null }
interface Ward { name: string }
interface MatchedOfficial {
  id: string;
  name: string;
  title: string;
  district: string;
  level: string;
  isClaimed: boolean;
  photoUrl: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    electionType: "municipal",
    jurisdiction: "",
    electionDate: "",
    candidateName: "",
    partyName: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Geo state ─────────────────────────────────────────────────────────────
  const [selectedProvince, setSelectedProvince] = useState("");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [loadingWards, setLoadingWards] = useState(false);
  const [hasElectionData, setHasElectionData] = useState(false);
  const [loadingElectionData, setLoadingElectionData] = useState(false);

  // ── Official matching ──────────────────────────────────────────────────────
  const [matchedOfficial, setMatchedOfficial] = useState<MatchedOfficial | null>(null);
  const [checkingOfficial, setCheckingOfficial] = useState(false);
  const [officialDismissed, setOfficialDismissed] = useState(false);
  const [officialId, setOfficialId] = useState<string | undefined>(undefined);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── 1. Load municipalities when province + election type changes ───────────
  useEffect(() => {
    if (form.electionType !== "municipal" || !selectedProvince) {
      setMunicipalities([]);
      setSelectedMunicipality("");
      setWards([]);
      setSelectedWard("");
      return;
    }
    setLoadingMunicipalities(true);
    fetch(`/api/geo/municipalities?province=${selectedProvince}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setMunicipalities(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMunicipalities(false));
  }, [form.electionType, selectedProvince]);

  // ── 2. Load wards when municipality changes ────────────────────────────────
  useEffect(() => {
    setWards([]);
    setSelectedWard("");
    if (!selectedMunicipality || !selectedProvince) return;

    setLoadingWards(true);
    fetch(
      `/api/geo/wards?province=${selectedProvince}&municipality=${encodeURIComponent(selectedMunicipality)}`
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWards(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingWards(false));
  }, [selectedMunicipality, selectedProvince]);

  // ── 3. Check for election data when municipality selected ─────────────────
  useEffect(() => {
    if (!selectedMunicipality) { setHasElectionData(false); return; }
    setLoadingElectionData(true);
    fetch(
      `/api/analytics/election-results?jurisdiction=${encodeURIComponent(selectedMunicipality)}&limit=1`
    )
      .then((r) => (r.ok ? r.json() : { data: { total: 0 } }))
      .then((d) => setHasElectionData((d.data?.total ?? 0) > 0))
      .catch(() => setHasElectionData(false))
      .finally(() => setLoadingElectionData(false));
  }, [selectedMunicipality]);

  // ── 4. Auto-fill jurisdiction from ward → municipality selection ──────────
  useEffect(() => {
    if (selectedWard) {
      set("jurisdiction", selectedWard);
    } else if (selectedMunicipality) {
      set("jurisdiction", selectedMunicipality);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard, selectedMunicipality]);

  // ── 5. Official name search ───────────────────────────────────────────────
  useEffect(() => {
    if (!form.candidateName || form.candidateName.length < 3 || officialDismissed) {
      setMatchedOfficial(null);
      return;
    }
    const params = new URLSearchParams({ search: form.candidateName, limit: "1" });
    if (selectedProvince) params.set("province", selectedProvince);

    const t = setTimeout(async () => {
      setCheckingOfficial(true);
      try {
        const res = await fetch(`/api/officials?${params}`);
        if (res.ok) {
          const d = await res.json();
          setMatchedOfficial(d.data?.[0] ?? null);
          setOfficialDismissed(false);
        }
      } catch { /* non-critical */ }
      finally { setCheckingOfficial(false); }
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.candidateName, officialDismissed, selectedProvince]);

  // ── Use matched official ───────────────────────────────────────────────────
  function applyOfficial() {
    if (!matchedOfficial) return;
    set("candidateName", matchedOfficial.name);
    set("jurisdiction", matchedOfficial.district);
    if (!form.name) set("name", `${matchedOfficial.name} — ${matchedOfficial.district}`);
    setSelectedMunicipality(matchedOfficial.district);
    setOfficialId(matchedOfficial.id);
    toast.success("Profile data pre-filled from official record");
    setOfficialDismissed(true);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
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
          officialId: officialId ?? (matchedOfficial && !officialDismissed ? matchedOfficial.id : undefined),
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
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isMunicipal = form.electionType === "municipal";

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Create New Campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Set up a new campaign. You can invite team members after.
        </p>
      </div>

      {/* Official match banner */}
      {matchedOfficial && !officialDismissed && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          {matchedOfficial.photoUrl ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-200 flex-shrink-0">
              <Image
                src={matchedOfficial.photoUrl}
                alt={matchedOfficial.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized={matchedOfficial.photoUrl.startsWith("http")}
              />
            </div>
          ) : (
            matchedOfficial.isClaimed
              ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              {matchedOfficial.isClaimed ? "Verified profile found" : "Unclaimed profile found — claim it"}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              <strong>{matchedOfficial.name}</strong> · {matchedOfficial.title} · {matchedOfficial.district}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={applyOfficial}
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
          {/* Campaign name */}
          <FormField label="Campaign Name" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Smith for Mayor 2026"
            />
          </FormField>

          {/* Election type + date */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Election Type" required>
              <Select value={form.electionType} onChange={(e) => set("electionType", e.target.value)}>
                {ELECTION_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Election Date">
              <Input
                type="date"
                value={form.electionDate}
                onChange={(e) => set("electionDate", e.target.value)}
              />
            </FormField>
          </div>

          {/* ── Geo flow for municipal elections ── */}
          {isMunicipal && (
            <>
              {/* Step 1: Province */}
              <FormField label="Province" required>
                <Select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedMunicipality("");
                    setSelectedWard("");
                  }}
                >
                  <option value="">Select a province…</option>
                  {PROVINCES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>

              {/* Step 2: Municipality */}
              {selectedProvince && (
                <FormField label="Municipality" required>
                  {loadingMunicipalities ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading municipalities…
                    </div>
                  ) : (
                    <Select
                      value={selectedMunicipality}
                      onChange={(e) => {
                        setSelectedMunicipality(e.target.value);
                        setSelectedWard("");
                      }}
                    >
                      <option value="">Select a municipality…</option>
                      {municipalities.map((m) => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </Select>
                  )}
                </FormField>
              )}

              {/* Step 3: Ward / District */}
              {selectedMunicipality && (
                <FormField label="Ward / District">
                  {loadingWards ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading wards…
                    </div>
                  ) : wards.length > 0 ? (
                    <Select
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                    >
                      <option value="">All wards (city-wide race)</option>
                      {wards.map((w) => (
                        <option key={w.name} value={w.name}>{w.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={selectedWard}
                      onChange={(e) => setSelectedWard(e.target.value)}
                      placeholder="e.g. Ward 3 — Etobicoke North (optional)"
                    />
                  )}
                </FormField>
              )}

              {/* Election data badge */}
              {selectedMunicipality && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                  hasElectionData
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                }`}>
                  {loadingElectionData ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking election data…</>
                  ) : hasElectionData ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> We have 2022 election results for {selectedMunicipality}</>
                  ) : (
                    <><MapPin className="w-3.5 h-3.5" /> No election data on file for this municipality yet</>
                  )}
                </div>
              )}
            </>
          )}

          {/* Jurisdiction (free text — auto-filled from ward/municipality) */}
          <FormField label="Jurisdiction">
            <Input
              value={form.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
              placeholder="Ward 12 — Toronto"
            />
          </FormField>

          {/* Candidate name with live official search */}
          <FormField label="Candidate Name">
            <div className="relative">
              <Input
                value={form.candidateName}
                onChange={(e) => {
                  set("candidateName", e.target.value);
                  setOfficialDismissed(false);
                  setOfficialId(undefined);
                }}
                placeholder="Jane Smith"
              />
              {checkingOfficial && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          </FormField>

          {/* Party */}
          <FormField label="Party or Organisation">
            <Input
              value={form.partyName}
              onChange={(e) => set("partyName", e.target.value)}
              placeholder="Independent / Liberal / NDP…"
            />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} className="flex-1">
              Create Campaign <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
