"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight, AlertCircle, CheckCircle, Loader2, MapPin,
  ClipboardList, Palette, Tag, SkipForward, ArrowRight, Check,
} from "lucide-react";
import {
  Button, Card, CardContent, FormField, Input, Select, Checkbox,
} from "@/components/ui";
import { toast } from "sonner";

// ─── Setup Step Definitions ──────────────────────────────────────────────────

const BUILT_IN_CANVASSING_FIELDS = [
  { key: "__sign_requested", label: "Sign Requested", description: "Track lawn sign requests" },
  { key: "__volunteer_interest", label: "Volunteer Interest", description: "Flag voters willing to volunteer" },
  { key: "__follow_up", label: "Follow-up Needed", description: "Mark contacts that need a callback" },
  { key: "__issues", label: "Issues", description: "Tag issues raised at the door" },
  { key: "__notes", label: "Notes", description: "Free-text canvasser notes" },
  { key: "__not_home", label: "Not Home", description: "Mark when nobody answers" },
  { key: "__support_level", label: "Support Level", description: "1-5 support rating" },
  { key: "__gotv_status", label: "GOTV Status", description: "Get-out-the-vote tracking" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const ELECTION_TYPES = [
  { value: "municipal", label: "Municipal" },
  { value: "provincial", label: "Provincial" },
  { value: "federal", label: "Federal" },
  { value: "by_election", label: "By-Election" },
  { value: "nomination", label: "Nomination Race" },
  { value: "leadership", label: "Leadership Race" },
  { value: "other", label: "Other" },
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

  // ── Post-creation setup wizard state ────────────────────────────────────────
  const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3>(0); // 0=not started, 1=fields, 2=issues, 3=colors
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [enabledFields, setEnabledFields] = useState<Set<string>>(
    new Set(BUILT_IN_CANVASSING_FIELDS.map((f) => f.key))
  );
  const [issuesList, setIssuesList] = useState<string[]>(["Roads", "Taxes", "Healthcare", "Housing", "Transit"]);
  const [newIssue, setNewIssue] = useState("");
  const [setupColors, setSetupColors] = useState({ primary: "#0A2342", accent: "#1D9E75" });
  const [savingSetup, setSavingSetup] = useState(false);

  function toggleField(key: string) {
    setEnabledFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addIssue() {
    const trimmed = newIssue.trim();
    if (!trimmed || issuesList.includes(trimmed)) return;
    setIssuesList((prev) => [...prev, trimmed]);
    setNewIssue("");
  }

  function removeIssue(issue: string) {
    setIssuesList((prev) => prev.filter((i) => i !== issue));
  }

  async function saveSetupStep() {
    if (!createdCampaignId) return;
    setSavingSetup(true);
    try {
      if (setupStep === 1) {
        // Toggle off disabled built-in fields
        const disabledKeys = BUILT_IN_CANVASSING_FIELDS
          .filter((f) => !enabledFields.has(f.key))
          .map((f) => f.key);
        if (disabledKeys.length > 0) {
          await fetch("/api/campaign-fields/bulk-toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId: createdCampaignId, keys: disabledKeys, isVisible: false }),
          });
        }
        setSetupStep(2);
      } else if (setupStep === 2) {
        // Save issues as a multiselect custom field
        if (issuesList.length > 0) {
          await fetch("/api/campaign-fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: createdCampaignId,
              key: "campaign_issues",
              label: "Campaign Issues",
              fieldType: "multiselect",
              category: "canvassing",
              options: issuesList,
              showOnCard: true,
              showOnList: true,
            }),
          });
        }
        setSetupStep(3);
      } else if (setupStep === 3) {
        // Save brand colors
        await fetch("/api/brand", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: createdCampaignId,
            primaryColor: setupColors.primary,
            accentColor: setupColors.accent,
          }),
        });
        toast.success("Campaign configured — let's finish setup!");
        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save — you can configure this later in Settings");
    } finally {
      setSavingSetup(false);
    }
  }

  function skipSetup() {
    if (setupStep < 3) {
      setSetupStep((s) => (s + 1) as 1 | 2 | 3);
    } else {
      router.push("/onboarding");
      router.refresh();
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!form.name || !form.electionType) {
      toast.error("Campaign name and election type are required");
      return;
    }
    if (isMunicipal && (!selectedProvince || !selectedMunicipality)) {
      toast.error("Province and municipality are required for municipal campaigns");
      return;
    }

    const jurisdiction =
      form.jurisdiction
      || (selectedWard
        ? `${selectedWard}, ${selectedMunicipality}, ${selectedProvince}`
        : selectedMunicipality
          ? `${selectedMunicipality}, ${selectedProvince}`
          : "");

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jurisdiction,
          candidateTitle: form.partyName || undefined,
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
        setCreatedCampaignId(data.data.id);
        setSetupStep(1);
      } else {
        toast.error(data.error ?? "Failed to create campaign");
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isMunicipal = form.electionType === "municipal";
  const isNomination = form.electionType === "nomination";
  const isLeadership = form.electionType === "leadership";
  const isPartyRace = isNomination || isLeadership;

  // ── Setup wizard (post-creation) ──────────────────────────────────────────
  if (setupStep > 0) {
    const steps = [
      { num: 1, label: "Fields", icon: ClipboardList },
      { num: 2, label: "Issues", icon: Tag },
      { num: 3, label: "Colors", icon: Palette },
    ];

    return (
      <div className="max-w-xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Setup Your Campaign</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure your environment. You can change everything later in Settings.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                setupStep === s.num
                  ? "bg-[#0A2342] text-white"
                  : setupStep > s.num
                    ? "bg-[#1D9E75]/10 text-[#1D9E75]"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {setupStep > s.num ? (
                <Check className="w-3 h-3" />
              ) : (
                <s.icon className="w-3 h-3" />
              )}
              {s.label}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Step 1: Configure canvassing fields */}
            {setupStep === 1 && (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Configure canvassing fields</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose which fields your canvassers see at the door.
                  </p>
                </div>
                <div className="space-y-2">
                  {BUILT_IN_CANVASSING_FIELDS.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={enabledFields.has(f.key)}
                        onChange={() => toggleField(f.key)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{f.label}</p>
                        <p className="text-xs text-gray-400">{f.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  You can add custom fields later in Settings &rarr; Fields.
                </p>
              </>
            )}

            {/* Step 2: Set campaign issues */}
            {setupStep === 2 && (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Set your campaign issues</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    These are the issues your canvassers can tag at the door. Add, remove, or reorder.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {issuesList.map((issue) => (
                    <span
                      key={issue}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0A2342]/5 text-[#0A2342] text-sm font-medium"
                    >
                      {issue}
                      <button
                        onClick={() => removeIssue(issue)}
                        className="w-4 h-4 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors text-xs leading-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newIssue}
                    onChange={(e) => setNewIssue(e.target.value)}
                    placeholder="Add an issue (e.g. Childcare, Environment)"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIssue(); } }}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addIssue} disabled={!newIssue.trim()}>
                    Add
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Set colors */}
            {setupStep === 3 && (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Set your campaign colors</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose a primary and accent color for your campaign brand.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Primary Color"
                    help={{
                      content: "Your main campaign colour. Used on signs, materials, and your public profile. Pick one that photographs well.",
                      example: "#0A2342 (navy)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={setupColors.primary}
                        onChange={(e) => setSetupColors((c) => ({ ...c, primary: e.target.value }))}
                        className="w-11 h-11 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <Input
                        value={setupColors.primary}
                        onChange={(e) => setSetupColors((c) => ({ ...c, primary: e.target.value }))}
                        className="font-mono text-xs flex-1"
                        placeholder="#0A2342"
                      />
                    </div>
                  </FormField>
                  <FormField
                    label="Accent Color"
                    help={{
                      content: "A complementary colour used for highlights, buttons, and call-to-action elements.",
                      example: "#1D9E75 (green)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={setupColors.accent}
                        onChange={(e) => setSetupColors((c) => ({ ...c, accent: e.target.value }))}
                        className="w-11 h-11 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <Input
                        value={setupColors.accent}
                        onChange={(e) => setSetupColors((c) => ({ ...c, accent: e.target.value }))}
                        className="font-mono text-xs flex-1"
                        placeholder="#1D9E75"
                      />
                    </div>
                  </FormField>
                </div>
                {/* Preview swatch */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: setupColors.primary }} />
                  <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: setupColors.accent }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: setupColors.primary }}>Campaign Name</p>
                    <p className="text-xs" style={{ color: setupColors.accent }}>Accent text preview</p>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={skipSetup} className="flex-1">
                <SkipForward className="w-4 h-4" /> Skip for now
              </Button>
              <Button onClick={saveSetupStep} loading={savingSetup} className="flex-1">
                {setupStep === 3 ? "Finish Setup" : "Save & Continue"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <FormField
            label="Campaign Name"
            required
            help={{
              content: "Your official campaign name. Appears on all communications and your public Poll City profile.",
              example: "Jane Smith for Ward 3 — 2026",
            }}
          >
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Smith for Mayor 2026"
            />
          </FormField>

          {/* Election type + date */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Election Type"
              required
              help={{
                content: "Choose the level of government you are running in. This affects how your canvassing data and analytics are organized.",
              }}
            >
              <Select value={form.electionType} onChange={(e) => set("electionType", e.target.value)}>
                {ELECTION_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Election Date"
              help={{
                content: "The official voting day. This drives your canvassing countdown, GOTV priorities, and advance vote scheduling.",
                tip: "Check your municipality's election office for the official date.",
              }}
            >
              <Input
                type="date"
                value={form.electionDate}
                onChange={(e) => set("electionDate", e.target.value)}
              />
            </FormField>
          </div>

          {/* ── Party + riding flow for nomination / leadership races ── */}
          {isPartyRace && (
            <>
              <FormField
                label="Party"
                required
                help={{
                  content: "The party you are seeking the nomination or leadership of.",
                  example: isLeadership ? "Ontario Liberal Party" : "NDP, Liberal, Conservative",
                }}
              >
                <Input
                  value={form.partyName}
                  onChange={(e) => set("partyName", e.target.value)}
                  placeholder={isLeadership ? "e.g. Ontario Liberal Party" : "e.g. NDP, Liberal, Conservative…"}
                />
              </FormField>
              {isNomination && (
                <FormField
                  label="Province"
                  required
                  help={{
                    content: "The province where the riding or riding association is located.",
                  }}
                >
                  <Select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      set("jurisdiction", e.target.value);
                    }}
                  >
                    <option value="">Select a province…</option>
                    {PROVINCES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField
                label={isLeadership ? "Level" : "Riding / Constituency"}
                help={{
                  content: isLeadership
                    ? "Whether this is a federal or provincial leadership contest."
                    : "The riding or constituency where you are seeking the nomination.",
                  example: isLeadership ? "Federal, Ontario" : "Riding 42 — Parkdale–High Park",
                }}
              >
                <Input
                  value={isLeadership ? selectedProvince : selectedWard}
                  onChange={(e) => {
                    if (isLeadership) {
                      setSelectedProvince(e.target.value);
                    } else {
                      setSelectedWard(e.target.value);
                      set("jurisdiction", e.target.value);
                    }
                  }}
                  placeholder={isLeadership ? "e.g. Federal, Ontario…" : "e.g. Riding 42 — Parkdale–High Park"}
                />
              </FormField>
            </>
          )}

          {/* ── Geo flow for municipal elections ── */}
          {isMunicipal && (
            <>
              {/* Step 1: Province */}
              <FormField
                label="Province"
                required
                help={{
                  content: "The province your municipality is in. This narrows the municipality list and connects your campaign to provincial election data.",
                }}
              >
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
                <FormField
                  label="Municipality"
                  required
                  help={{
                    content: "The city or town you are running in. This links your campaign to voter data, ward boundaries, and historical election results.",
                    tip: "Select the municipality that appears on your official ballot papers.",
                  }}
                >
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
                <FormField
                  label="Ward / District"
                  help={{
                    content: "The specific ward or district within the municipality. This sets your canvassing boundaries and voter data. Leave blank if you are running city-wide.",
                    example: "Ward 3 — Etobicoke North",
                    tip: "Make sure this matches the official ward name from Elections Ontario exactly.",
                  }}
                >
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
          <FormField
            label="Jurisdiction"
            help={{
              content: "Auto-filled from your province, municipality, and ward selections above. Edit only if you need to customize it.",
              example: "Ward 12 — Toronto",
            }}
          >
            <Input
              value={form.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
              placeholder="Ward 12 — Toronto"
            />
          </FormField>

          {/* Candidate name with live official search */}
          <FormField
            label="Candidate Name"
            help={{
              content: "The candidate's full name exactly as it will appear on the ballot. We'll search for an existing Poll City profile as you type.",
              tip: "If a profile is found, you can import the official data to pre-fill your campaign.",
            }}
          >
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

          {/* Party — only show when not already captured above in the party-race flow */}
          {!isPartyRace && (
            <FormField
              label="Party or Organisation"
              help={{
                content: "The party or organisation the candidate is affiliated with. Leave blank if running as an independent.",
                example: "Independent, Liberal, NDP, Conservative",
              }}
            >
              <Input
                value={form.partyName}
                onChange={(e) => set("partyName", e.target.value)}
                placeholder="Independent / Liberal / NDP…"
              />
            </FormField>
          )}

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
