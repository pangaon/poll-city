import Link from "next/link";
import { Eye, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Try the Poll City Demo",
  description: "Tour Poll City with pre-loaded demo data. No login required.",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
        <p className="text-amber-900 text-sm">
          <Eye className="inline w-4 h-4 mr-1.5" />
          You&apos;re viewing a demo. Data is pre-populated. No changes persist.
        </p>
      </div>

      <section
        className="px-4 py-16 text-white"
        style={{ background: "linear-gradient(135deg,#1E3A8A 0%,#0f172a 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold">Try Poll City, no login</h1>
          <p className="mt-3 text-lg text-blue-100">
            Tour the dashboard, contacts, canvassing, and budget tools with the Jane Smith
            Ward 20 Toronto demo campaign.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        <DemoCard title="Campaign Dashboard" description="Live metrics, widgets, GOTV meter." href="/dashboard?demo=1" />
        <DemoCard title="Contacts CRM" description="Search, filter, tag, and score 2,500 sample voters." href="/contacts?demo=1" />
        <DemoCard title="Canvassing Walk List" description="See turfs, routes, and door-knock outcomes." href="/canvassing/walk?demo=1" />
        <DemoCard title="Budget & Donations" description="Track spending against limits, log donations." href="/budget?demo=1" />
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <div className="rounded-2xl border border-blue-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Ready for your own campaign?</h2>
          <p className="text-slate-600 mt-2">Free tier includes 500 contacts, GOTV tools, and Adoni AI.</p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 mt-5 bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-800"
          >
            Start my campaign <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function DemoCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-1">{description}</p>
      <span className="inline-flex items-center gap-1 text-blue-700 text-sm font-semibold mt-3">
        Open <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
