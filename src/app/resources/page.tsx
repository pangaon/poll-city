import Link from "next/link";
import { FileText, FileSpreadsheet, Download } from "lucide-react";
import PublicNav from "@/components/layout/public-nav";

export const metadata = {
  title: "Resource Library — Poll City",
  description:
    "Free campaign templates, scripts, checklists, and tools for Canadian candidates and volunteers.",
};

const TEMPLATES: Array<{
  slug: string;
  title: string;
  category: string;
  format: "html" | "csv";
}> = [
  { slug: "volunteer-signup", title: "Volunteer Sign-Up Sheet", category: "Volunteers", format: "html" },
  { slug: "canvasser-checklist", title: "Canvasser Pre-Shift Checklist", category: "Canvassing", format: "html" },
  { slug: "door-knock-codes", title: "Door-Knock Result Codes", category: "Canvassing", format: "html" },
  { slug: "script-supporter", title: "Script — Confirmed Supporter", category: "Canvassing", format: "html" },
  { slug: "script-persuadable", title: "Script — Persuadable Voter", category: "Canvassing", format: "html" },
  { slug: "script-opposition", title: "Script — Opposition", category: "Canvassing", format: "html" },
  { slug: "election-day-checklist", title: "Election Day Hour-by-Hour", category: "Election Day", format: "html" },
  { slug: "gotv-phone-script", title: "GOTV Phone Script", category: "GOTV", format: "html" },
  { slug: "scrutineers-guide", title: "Scrutineer's Guide", category: "Election Day", format: "html" },
  { slug: "poll-captain-handbook", title: "Poll Captain Handbook", category: "Election Day", format: "html" },
  { slug: "donation-pledge", title: "Donation Pledge Card", category: "Finance", format: "html" },
  { slug: "donation-receipt", title: "Donation Receipt (Ontario)", category: "Finance", format: "html" },
  { slug: "expense-tracker", title: "Expense Tracker", category: "Finance", format: "csv" },
  { slug: "social-calendar", title: "Social Calendar", category: "Comms", format: "csv" },
  { slug: "press-release", title: "Press Release Template", category: "Comms", format: "html" },
  { slug: "finance-checklist", title: "Finance Checklist", category: "Finance", format: "html" },
  { slug: "campaign-bio", title: "Candidate Bio", category: "Candidate", format: "html" },
  { slug: "volunteer-certificate", title: "Volunteer Certificate", category: "Volunteers", format: "html" },
];

const CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)));

export default function ResourceLibraryPage() {
  return (
    <>
    <PublicNav />
    <main className="min-h-screen bg-slate-50">
      <section
        className="px-4 py-16 text-white"
        style={{ background: "linear-gradient(135deg,#D71920 0%,#1A4782 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold">Resource Library</h1>
          <p className="mt-3 text-lg text-blue-100 max-w-2xl">
            Free, printable campaign templates for Canadian candidates, volunteers, and
            poll captains. Download, print, and use today.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                <a
                  key={t.slug}
                  href={`/api/resources/templates/${t.slug}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {t.format === "csv" ? (
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-700 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
                        {t.format}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-slate-400" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <h3 className="text-xl font-bold text-blue-900">Need something custom?</h3>
          <p className="text-blue-800 mt-2">
            Sign up for Poll City to get AI-generated scripts, press releases, and social
            posts tailored to your campaign.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-800"
          >
            Start your free campaign
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}
