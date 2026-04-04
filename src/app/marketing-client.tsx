"use client";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Users, MapPin, CheckCircle, BarChart3, Printer,
  Megaphone, Shield, ArrowRight, Star
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Voter CRM",
    description:
      "Track every voter interaction — door knocks, phone calls, events. Build detailed profiles with support levels, issues, and follow-ups.",
  },
  {
    icon: MapPin,
    title: "Canvassing Tools",
    description:
      "Assign walk lists, track coverage in real time, and capture doorstep data on mobile. Your team stays coordinated in the field.",
  },
  {
    icon: BarChart3,
    title: "GOTV Engine",
    description:
      "Upload same-day voted lists, auto-match against your supporters, and focus your team on voters who haven't cast a ballot yet.",
  },
  {
    icon: Printer,
    title: "Print Marketplace",
    description:
      "Post jobs for lawn signs, flyers, door hangers and more. Licensed print shops bid — you pick the best price and turnaround.",
  },
  {
    icon: Megaphone,
    title: "Public Candidate Page",
    description:
      "Your shareable campaign page collects volunteer signups, sign requests, supporter pledges, and voter questions.",
  },
  {
    icon: Shield,
    title: "Secure & Privacy-First",
    description:
      "Built to MFIPPA standards with full audit logs, role-based access, and consent tracking for every piece of voter data.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Poll City gave our volunteer team the tools to knock 8,000 doors before election day. We won by 340 votes.",
    name: "Sarah M.",
    role: "Ward 4 Councillor, Hamilton",
  },
  {
    quote:
      "The sign tracker alone saved us hours every week. Our sign crew knew exactly where to go every morning.",
    name: "James P.",
    role: "Campaign Manager, Brampton",
  },
  {
    quote:
      "I ran as an independent with no party backing. Poll City's print marketplace saved me 30% on my flyer order.",
    name: "Diane L.",
    role: "Trustee Candidate, Toronto DSB",
  },
];

export default function MarketingClient() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-blue-700 text-lg tracking-tight">
            Poll City
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
              Pricing
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-700 to-blue-600 text-white py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-block bg-blue-500/40 text-blue-100 text-xs font-medium px-3 py-1 rounded-full mb-5">
            Trusted by campaigns across Ontario
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            The Complete Political<br />Operating System
          </h1>
          <p className="text-blue-100 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
            Voter CRM, canvassing tools, GOTV engine, print marketplace, and a public
            candidate page — everything your campaign needs, in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2">
                Start your free trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10">
                View pricing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-blue-200 mt-4">No credit card required · 14-day free trial</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything your campaign needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From your first canvass walk to election-day GOTV, Poll City keeps your team
              organized and your data actionable.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <f.icon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">What campaigns are saying</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 border">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-700 text-white">
        <div className="container mx-auto max-w-2xl text-center">
          <CheckCircle className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-3">Ready to run a smarter campaign?</h2>
          <p className="text-blue-200 mb-8">
            Join hundreds of Ontario candidates who use Poll City to organize their teams,
            track supporters, and win elections.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-sm text-gray-400">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-gray-600">Poll City</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/privacy-policy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          </div>
          <span>© {new Date().getFullYear()} Poll City. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
