"use client";

import { useEffect, useMemo, useState } from "react";

type InviteData = {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredWard: string | null;
  campaign: {
    id: string;
    name: string;
    candidateName: string | null;
    logoUrl: string | null;
    volunteerCodeOfConduct: string | null;
    volunteerIntroVideoUrl: string | null;
  };
};

const availabilityOptions = [
  "Weekday evenings",
  "Weekend mornings",
  "Weekend afternoons",
  "Flexible",
];

const skillOptions = [
  "Bilingual",
  "Has vehicle",
  "Social media",
  "Professional background",
  "Previous canvassing experience",
];

export default function VolunteerOnboardingClient({ token }: { token: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredWard, setPreferredWard] = useState("");
  const [acceptedCode, setAcceptedCode] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(`/api/volunteer/onboard/${token}`);
      const data = await res.json();
      if (!mounted) return;
      if (!res.ok) {
        setError(data.error ?? "Unable to load onboarding token");
        setLoading(false);
        return;
      }
      setInvite(data.data);
      setFirstName(data.data.firstName);
      setLastName(data.data.lastName);
      setEmail(data.data.email);
      setPhone(data.data.phone ?? "");
      setPreferredWard(data.data.preferredWard ?? "");
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const wards = useMemo(() => {
    const fromInvite = invite?.preferredWard ? [invite.preferredWard] : [];
    return Array.from(new Set([...fromInvite, "Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"]));
  }, [invite?.preferredWard]);

  if (loading) return <div className="max-w-2xl mx-auto py-16 px-4">Loading onboarding...</div>;
  if (error || !invite) return <div className="max-w-2xl mx-auto py-16 px-4 text-red-600">{error ?? "Invalid token"}</div>;

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/volunteer/onboard/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        availability,
        skills,
        preferredWard,
        acceptedCode,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Failed to complete onboarding");
      return;
    }
    setStep(7);
  }

  function toggleValue(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-700">Volunteer Onboarding</p>
          <h1 className="text-2xl font-bold text-gray-900">{invite.campaign.name}</h1>
          <p className="text-sm text-gray-500">Step {step} of 7</p>
          {invite.campaign.logoUrl && (
            <img src={invite.campaign.logoUrl} alt={`${invite.campaign.name} candidate`} className="mt-4 h-20 w-20 object-cover rounded-full border" />
          )}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm your details</h2>
            <input className="w-full border rounded-lg px-3 py-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            <input className="w-full border rounded-lg px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            <input className="w-full border rounded-lg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input className="w-full border rounded-lg px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Availability</h2>
            {availabilityOptions.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input type="checkbox" checked={availability.includes(option)} onChange={() => toggleValue(availability, option, setAvailability)} />
                {option}
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Skills</h2>
            {skillOptions.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input type="checkbox" checked={skills.includes(option)} onChange={() => toggleValue(skills, option, setSkills)} />
                {option}
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Preferred neighbourhood or ward</h2>
            <select className="w-full border rounded-lg px-3 py-2" value={preferredWard} onChange={(e) => setPreferredWard(e.target.value)}>
              <option value="">Select a ward</option>
              {wards.map((ward) => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Watch campaign intro</h2>
            {invite.campaign.volunteerIntroVideoUrl ? (
              <iframe
                title="Campaign intro"
                src={invite.campaign.volunteerIntroVideoUrl}
                className="w-full aspect-video rounded-xl border"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p className="text-sm text-gray-500">No campaign intro video configured yet.</p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Volunteer Code of Conduct</h2>
            <div className="border rounded-xl p-4 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
              {invite.campaign.volunteerCodeOfConduct ?? "Respect residents, follow campaign policies, and represent the campaign professionally."}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={acceptedCode} onChange={(e) => setAcceptedCode(e.target.checked)} />
              I have read and accept the volunteer code of conduct.
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 text-center py-4">
            <h2 className="text-2xl font-bold text-green-700">You are all set.</h2>
            <p className="text-gray-600">Thank you for onboarding. Campaign staff will contact you with next steps.</p>
            <a href="/social" className="inline-flex bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold">Download App</a>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        {step < 7 && (
          <div className="mt-6 flex justify-between">
            <button disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))} className="px-4 py-2 rounded-lg border text-sm">Back</button>
            {step < 6 && (
              <button onClick={() => setStep((s) => Math.min(6, s + 1))} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm">Next</button>
            )}
            {step === 6 && (
              <button disabled={!acceptedCode || submitting} onClick={submit} className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm disabled:opacity-60">
                {submitting ? "Submitting..." : "Complete Onboarding"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
