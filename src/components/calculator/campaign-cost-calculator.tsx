"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ElectionType =
  | "municipal-council"
  | "municipal-mayor"
  | "school-board"
  | "provincial-mpp"
  | "federal-mp"
  | "regional-chair"
  | "ward-by-election"
  | "township-council"
  | "city-council"
  | "rural-municipality"
  | "first-nations"
  | "student-union"
  | "party-nomination"
  | "leadership-race"
  | "other";

type Province = "ON" | "BC" | "AB" | "SK" | "MB" | "QC" | "NB" | "NS" | "PE" | "NL" | "YT" | "NT" | "NU";

interface Props {
  compact?: boolean;
  defaultElectionType?: ElectionType;
}

const ELECTION_TYPES: Array<{ value: ElectionType; label: string; baseSpendMultiplier: number; defaultDays: number }> = [
  { value: "municipal-council", label: "Municipal Council", baseSpendMultiplier: 1.0, defaultDays: 120 },
  { value: "municipal-mayor", label: "Municipal Mayor", baseSpendMultiplier: 1.6, defaultDays: 140 },
  { value: "school-board", label: "School Board", baseSpendMultiplier: 0.7, defaultDays: 100 },
  { value: "provincial-mpp", label: "Provincial MPP", baseSpendMultiplier: 2.1, defaultDays: 180 },
  { value: "federal-mp", label: "Federal MP", baseSpendMultiplier: 2.4, defaultDays: 180 },
  { value: "regional-chair", label: "Regional Chair", baseSpendMultiplier: 1.5, defaultDays: 130 },
  { value: "ward-by-election", label: "Ward By-Election", baseSpendMultiplier: 0.85, defaultDays: 75 },
  { value: "township-council", label: "Township Council", baseSpendMultiplier: 0.6, defaultDays: 90 },
  { value: "city-council", label: "City Council", baseSpendMultiplier: 1.2, defaultDays: 130 },
  { value: "rural-municipality", label: "Rural Municipality", baseSpendMultiplier: 0.65, defaultDays: 110 },
  { value: "first-nations", label: "First Nations Election", baseSpendMultiplier: 0.7, defaultDays: 80 },
  { value: "student-union", label: "Student Union", baseSpendMultiplier: 0.45, defaultDays: 40 },
  { value: "party-nomination", label: "Party Nomination", baseSpendMultiplier: 1.0, defaultDays: 90 },
  { value: "leadership-race", label: "Leadership Race", baseSpendMultiplier: 3.0, defaultDays: 220 },
  { value: "other", label: "Other", baseSpendMultiplier: 1.0, defaultDays: 120 },
];

const PROVINCE_MULTIPLIER: Record<Province, number> = {
  ON: 1.12,
  BC: 1.08,
  AB: 1.04,
  SK: 0.93,
  MB: 0.94,
  QC: 1.06,
  NB: 0.87,
  NS: 0.88,
  PE: 0.78,
  NL: 0.82,
  YT: 0.9,
  NT: 0.92,
  NU: 0.96,
};

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = value;
    const duration = 400;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function currency(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export default function CampaignCostCalculator({ compact = false, defaultElectionType = "municipal-council" }: Props) {
  const [electionType, setElectionType] = useState<ElectionType>(defaultElectionType);
  const [province, setProvince] = useState<Province>("ON");
  const [municipalitySize, setMunicipalitySize] = useState(50000);

  const selectedType = useMemo(
    () => ELECTION_TYPES.find((item) => item.value === electionType) ?? ELECTION_TYPES[0],
    [electionType],
  );

  const daysToElection = selectedType.defaultDays;

  const calculations = useMemo(() => {
    const sizeFactor = Math.max(0.4, Math.min(4.8, municipalitySize / 50_000));
    const legalLimit = Math.round(35_000 * selectedType.baseSpendMultiplier * PROVINCE_MULTIPLIER[province] * sizeFactor);
    const budgetLow = Math.round(legalLimit * 0.55);
    const budgetHigh = Math.round(legalLimit * 0.95);
    const budgetMid = Math.round((budgetLow + budgetHigh) / 2);

    const breakdown = {
      canvassing: Math.round(budgetMid * 0.26),
      signs: Math.round(budgetMid * 0.24),
      voice: Math.round(budgetMid * 0.16),
      print: Math.round(budgetMid * 0.15),
      pollCity: 799,
    };

    return {
      legalLimit,
      budgetLow,
      budgetHigh,
      budgetMid,
      breakdown,
      pollCityShare: Math.max(1, Math.round((799 / budgetMid) * 100)),
      formula: `35000 × ${selectedType.baseSpendMultiplier.toFixed(2)} × ${PROVINCE_MULTIPLIER[province].toFixed(2)} × ${(sizeFactor).toFixed(2)}`,
    };
  }, [municipalitySize, province, selectedType]);

  const animatedLimit = useAnimatedNumber(calculations.legalLimit);
  const animatedLow = useAnimatedNumber(calculations.budgetLow);
  const animatedHigh = useAnimatedNumber(calculations.budgetHigh);

  return (
    <section className={compact ? "rounded-2xl border border-slate-200 bg-white p-4" : "rounded-3xl border border-slate-200 bg-white p-6 md:p-8"}>
      {!compact && (
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Campaign Cost Calculator</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Estimate your election budget in real time</h2>
        </div>
      )}

      <div className={`mt-4 grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        <label className="text-sm text-slate-600">
          What are you running for?
          <select value={electionType} onChange={(e) => setElectionType(e.target.value as ElectionType)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {ELECTION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Province
          <select value={province} onChange={(e) => setProvince(e.target.value as Province)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {Object.keys(PROVINCE_MULTIPLIER).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Ward or municipality size
          <input
            type="number"
            min={5000}
            step={500}
            value={municipalitySize}
            onChange={(e) => setMunicipalitySize(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Days until election
          <input readOnly value={daysToElection} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-blue-700">Legal spending limit</p>
          <p className="mt-1 text-3xl font-extrabold text-blue-900">{currency(animatedLimit)}</p>
          <p className="mt-1 text-xs text-blue-700">Formula: {calculations.formula}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Total campaign budget (low)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{currency(animatedLow)}</p>
            </div>
            <div className="rounded-xl bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Total campaign budget (high)</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{currency(animatedHigh)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["Canvassing and materials", calculations.breakdown.canvassing, "bg-blue-600"],
              ["Signs", calculations.breakdown.signs, "bg-emerald-600"],
              ["Voice and communications", calculations.breakdown.voice, "bg-amber-500"],
              ["Print", calculations.breakdown.print, "bg-purple-600"],
              ["Poll City platform", calculations.breakdown.pollCity, "bg-rose-600"],
            ].map(([label, amount, color]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{label}</span>
                  <span>{currency(Number(amount))}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(4, Math.round((Number(amount) / calculations.budgetHigh) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-sm text-slate-700">
            Poll City share of total budget: <span className="font-semibold text-blue-800">{calculations.pollCityShare}%</span>
          </p>
        </div>

        {!compact && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Competitor comparison</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2">Platform</th>
                    <th className="pb-2">Monthly</th>
                    <th className="pb-2">Annual</th>
                    <th className="pb-2">What is missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-2">NationBuilder</td><td>$299</td><td>$3,588</td><td>No AI, no voice, no Canadian compliance</td></tr>
                  <tr><td className="py-2">NGP VAN</td><td>$400</td><td>$4,800</td><td>US-focused, no voice, no maps</td></tr>
                  <tr><td className="py-2">5 separate tools</td><td>$1,047</td><td>$12,564</td><td>Nothing connected, 5 logins</td></tr>
                  <tr className="bg-blue-50"><td className="py-2 font-semibold">Poll City</td><td className="font-semibold">One-time $799</td><td className="font-semibold">Done</td><td className="font-semibold">Everything included</td></tr>
                </tbody>
              </table>
            </div>
            <Link href="/register" className="mt-4 inline-flex w-full justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              Start your free 14-day trial
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
