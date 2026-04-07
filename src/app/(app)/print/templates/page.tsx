import Link from "next/link";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const PRICING: Record<string, { label: string; fromCad: number; turnaround: string }> = {
  "lawn-sign": { label: "Lawn Signs", fromCad: 4.49, turnaround: "5-7 days" },
  "door-hanger": { label: "Door Hangers", fromCad: 0.12, turnaround: "4-6 days" },
  flyer: { label: "Flyers", fromCad: 0.09, turnaround: "3-5 days" },
  "palm-card": { label: "Palm Cards", fromCad: 0.18, turnaround: "3-5 days" },
  postcard: { label: "Postcards", fromCad: 0.22, turnaround: "3-5 days" },
  "mailer-postcard": { label: "Postcards", fromCad: 0.22, turnaround: "3-5 days" },
  "bumper-sticker": { label: "Bumper Stickers", fromCad: 1.90, turnaround: "5-7 days" },
  button: { label: "Buttons", fromCad: 0.89, turnaround: "5-7 days" },
  "button-pin": { label: "Buttons", fromCad: 0.89, turnaround: "5-7 days" },
  sticker: { label: "Stickers", fromCad: 0.39, turnaround: "3-5 days" },
  "t-shirt": { label: "T-Shirts", fromCad: 14.99, turnaround: "7-10 days" },
  shirt: { label: "T-Shirts", fromCad: 14.99, turnaround: "7-10 days" },
  hat: { label: "Hats", fromCad: 18.99, turnaround: "7-10 days" },
  "tote-bag": { label: "Tote Bags", fromCad: 11.99, turnaround: "7-10 days" },
  tote: { label: "Tote Bags", fromCad: 11.99, turnaround: "7-10 days" },
  banner: { label: "Banners", fromCad: 45.00, turnaround: "7-14 days" },
  "window-sign": { label: "Window Clings", fromCad: 4.50, turnaround: "5-7 days" },
  "yard-stake": { label: "Yard Stakes", fromCad: 3.50, turnaround: "5-7 days" },
  "table-cover": { label: "Table Covers", fromCad: 89.00, turnaround: "7-10 days" },
  lanyard: { label: "Lanyards", fromCad: 2.50, turnaround: "7-10 days" },
};

export default async function PrintTemplatesPage() {
  const { campaignId } = await resolveActiveCampaign();

  const templates = await prisma.printTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, slug: true, name: true, category: true, width: true, height: true, isPremium: true },
  });

  const byCategory = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header
        className="rounded-2xl p-6 md:p-10 text-white mb-8"
        style={{ background: "linear-gradient(135deg,#1A4782 0%,#D71920 100%)" }}
      >
        <h1 className="text-2xl md:text-4xl font-extrabold">Print Templates</h1>
        <p className="text-blue-100 mt-2 md:mt-3 text-sm md:text-base max-w-xl">
          Campaign materials auto-branded with your colours and logo. Download print-ready files or order delivery.
        </p>
        <Link
          href="/settings/brand"
          className="inline-block mt-4 bg-white text-blue-900 font-bold px-5 h-11 leading-[2.75rem] rounded-lg hover:bg-blue-50"
        >
          Set up your Brand Kit →
        </Link>
      </header>

      {Object.entries(byCategory).map(([category, items]) => {
        const p = PRICING[category];
        return (
          <section key={category} className="mb-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-900">{p?.label ?? category}</h2>
              {p && (
                <p className="text-xs md:text-sm text-slate-500">
                  From ${p.fromCad.toFixed(2)} · {p.turnaround}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((t) => (
                <Link
                  key={t.id}
                  href={`/print/design/${t.slug}?campaignId=${campaignId}`}
                  className="block bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    {t.width}" × {t.height}"
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900">{t.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">Tap to customize →</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
