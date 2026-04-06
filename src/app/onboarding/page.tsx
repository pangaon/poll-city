import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import CampaignCostCalculator from "@/components/calculator/campaign-cost-calculator";

export const metadata = {
  title: "Get started with Poll City",
  description: "5-step onboarding to launch your campaign on Poll City.",
};

const STEPS = [
  { n: 1, title: "Welcome", description: "Confirm your campaign name, jurisdiction, and election date.", href: "/campaigns/new" },
  { n: 2, title: "Import contacts", description: "Upload a CSV or pull from a voter list. We'll dedupe automatically.", href: "/import-export/smart-import" },
  { n: 3, title: "Build your first turf", description: "Draw a polygon on the map to create your first canvass assignment.", href: "/canvassing/turf-builder" },
  { n: 4, title: "Invite your team", description: "Add campaign managers, canvassers, and volunteers.", href: "/settings/team" },
  { n: 5, title: "Launch", description: "Review your health score and go live.", href: "/dashboard" },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section
        className="px-4 py-16 text-white"
        style={{ background: "linear-gradient(135deg,#1E3A8A 0%,#0f172a 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold">Let&apos;s get you set up</h1>
          <p className="mt-3 text-lg text-blue-100">
            Five quick steps. Most campaigns finish in under 20 minutes.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {STEPS.map((s) => (
          <Link
            key={s.n}
            href={s.href}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
              {s.n}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900">{s.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{s.description}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-slate-300 mt-1 shrink-0" />
          </Link>
        ))}

        <div className="pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Step 3 planning helper</p>
          <CampaignCostCalculator compact defaultElectionType="municipal-council" />
        </div>
      </section>
    </main>
  );
}
