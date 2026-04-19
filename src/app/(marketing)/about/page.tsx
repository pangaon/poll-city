import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Shield, MapPin, Users, Target,
  CheckCircle2, Globe, BarChart3, Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Poll City — Built by a Campaign Manager, Not a Developer",
  description:
    "Poll City was built by George Hatzis — 35 years of Canadian political campaigns. Not a Silicon Valley startup. A platform built by someone who has knocked more doors than any developer on the planet.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Poll City" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-bold text-slate-900">Poll City</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/pricing" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Start Your Campaign
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20" style={{ background: "linear-gradient(145deg, #0B1120 0%, #162037 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">The founder</p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            Built by a campaign manager.<br />
            <span className="text-blue-400">Not a developer.</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-2xl">
            Every other political software platform was built by engineers who read about campaigns.
            Poll City was built by someone who has been in the war room on election night, who has knocked
            doors in January, who has had the hard conversation when the numbers aren&apos;t there.
          </p>
        </div>
      </section>

      {/* Founder story */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-6 text-slate-700 leading-relaxed">
              <h2 className="text-3xl font-black text-slate-900">George Hatzis</h2>
              <p className="text-lg text-slate-600 font-medium">
                35 years in Canadian politics. Founder of Poll City.
              </p>
              <p>
                I&apos;ve managed campaigns at every level — school board trustee races in small Ontario towns,
                city council fights in the middle of Toronto, and provincial races where the margin was thin
                enough to count every door twice.
              </p>
              <p>
                For 35 years I watched campaigns run the same way: donor spreadsheet here, canvassing
                WhatsApp group there, website on a platform that had no idea who just donated, and an
                election night that felt improvised. Campaigns win on organization. And organization
                keeps getting harder when your tools don&apos;t talk to each other.
              </p>
              <p>
                I built Poll City because the platform I needed to run campaigns the right way didn&apos;t
                exist. Not for Canadian candidates. Not at a price that made sense for a ward-level race.
                Not with the compliance requirements our system demands. Not built by anyone who actually
                understood what election day feels like.
              </p>
              <p>
                The tools in Poll City aren&apos;t features someone invented in a product meeting.
                They&apos;re answers to specific problems I&apos;ve watched campaigns lose because they
                didn&apos;t have the right infrastructure. The GOTV engine, the canvassing walk lists,
                the fundraising compliance rules, the election night war room — every one of them comes
                from a real campaign moment where the right tool made the difference between winning and
                going home early.
              </p>
              <p className="font-semibold text-slate-900">
                If you&apos;re a first-time candidate running for city council, or a veteran MPP building
                your fifth campaign, this platform was built for you. By someone who knows what you&apos;re
                about to go through.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">By the numbers</p>
                {[
                  { stat: "35", label: "Years in Canadian politics" },
                  { stat: "Oct 2026", label: "First major target election" },
                  { stat: "1,100+", label: "Officials already profiled" },
                  { stat: "3", label: "Products on one platform" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-14 shrink-0">
                      <p className="text-xl font-black text-blue-600">{s.stat}</p>
                    </div>
                    <p className="text-sm text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">What we&apos;re building for</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The October 2026 Ontario municipal elections. 444 municipalities.
                  Thousands of first-time candidates. We want every one of them to have
                  enterprise-grade tools — not just the ones who can afford NationBuilder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform overview */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center mb-3">
            Three products. One Canadian platform.
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-xl mx-auto text-sm">
            Built as a monolith so they actually talk to each other. Not an integration — a platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Campaign App",
                url: "app.poll.city",
                color: "bg-blue-600",
                desc: "The campaign operating system. CRM, canvassing, communications, GOTV, fundraising, finance, analytics — every tool a campaign needs from announcement to election night.",
                features: ["Voter CRM", "Canvassing + GPS", "Email & SMS", "GOTV engine", "Adoni AI"],
              },
              {
                name: "Poll City Social",
                url: "social.poll.city",
                color: "bg-emerald-600",
                desc: "The civic engagement layer. Voters follow officials, respond to polls, join interest groups. When they follow a candidate, the campaign gets notified.",
                features: ["1,100+ officials", "Live approval ratings", "Civic polls", "Interest groups", "Follow signal → CRM"],
              },
              {
                name: "Intelligence Engine",
                url: "app.poll.city/intel",
                color: "bg-violet-600",
                desc: "Automated candidate detection, approval rating tracking, media monitoring, and outreach sequencing. The system that finds candidates before they find us.",
                features: ["Lead detection", "Approval tracking", "Media monitoring", "Outreach CRM", "RCAE alerts"],
              },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${p.color} text-white text-xs font-bold mb-4`}>
                  {p.name}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-3">{p.url}</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Canada */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">
            Built for Canada. Not ported from somewhere else.
          </h2>
          <p className="text-slate-500 mb-10 max-w-2xl leading-relaxed">
            US political software is built around US electoral systems, US data regulations, and US campaign law.
            None of that applies here. Poll City was built ground-up for the Canadian context.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: "PIPEDA compliant", desc: "Canadian data sovereignty. Your voter data stays in Canada." },
              { icon: Globe, title: "CASL compliant", desc: "Consent management built in. Not bolted on." },
              { icon: MapPin, title: "Canadian electoral geography", desc: "Ridings, wards, polling divisions — our system knows the difference." },
              { icon: BarChart3, title: "Canadian contribution rules", desc: "Federal, provincial, and municipal limits enforced automatically." },
              { icon: Calendar, title: "Ontario municipal elections", desc: "Built around the October 2026 election cycle. Not a general election tool." },
              { icon: Users, title: "All levels of government", desc: "School board trustee to MP — one platform, every race type." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "linear-gradient(145deg, #0B1120 0%, #162037 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white tracking-tight">
            Ready to run a real campaign?
          </h2>
          <p className="mt-4 text-slate-400">
            14-day free trial. Campaign website included. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              Start Your Campaign <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/15 border border-white/10">
              <Globe className="w-4 h-4" /> Explore the Platform
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-green-400" /> PIPEDA Compliant</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Canadian Hosted</span>
            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-amber-400" /> Ontario 2026 Ready</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Poll City" className="w-6 h-6 rounded object-contain" />
            <span className="text-sm font-semibold text-white">Poll City</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/demo" className="hover:text-white transition-colors">Demo</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Poll City</p>
        </div>
      </footer>
    </div>
  );
}
