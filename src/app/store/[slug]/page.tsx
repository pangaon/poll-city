import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { loadBrandKit, fontCss } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { name: true, candidateName: true },
  });
  return {
    title: `${campaign?.candidateName ?? campaign?.name ?? "Campaign"} — Official Store`,
    description: "Official campaign merchandise. All proceeds support the campaign.",
  };
}

export default async function MerchStorePage({ params }: { params: { slug: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, candidateName: true, candidateTitle: true, jurisdiction: true, logoUrl: true, isPublic: true, isActive: true },
  });
  if (!campaign || !campaign.isActive) notFound();

  const brand = await loadBrandKit(campaign.id);
  const products = await prisma.merchProduct.findMany({
    where: { campaignId: campaign.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const font = fontCss(brand.fontPrimary);

  return (
    <main className="min-h-screen bg-slate-50" style={{ fontFamily: font }}>
      {/* Hero */}
      <header
        className="px-4 py-10 md:py-16 text-white"
        style={{ background: `linear-gradient(135deg,${brand.primaryColor} 0%,${brand.secondaryColor} 100%)` }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="h-16 md:h-24 w-auto mx-auto mb-4" />
          )}
          <p className="text-xs md:text-sm uppercase tracking-widest opacity-80">Official Store</p>
          <h1 className="text-3xl md:text-5xl font-extrabold mt-1">
            {brand.candidateName ?? brand.campaignName}
          </h1>
          {campaign.jurisdiction && <p className="opacity-85 mt-2">{campaign.jurisdiction}</p>}
          <p className="opacity-90 mt-4 max-w-lg mx-auto text-sm md:text-base">
            All proceeds support the campaign. Every shirt, hat, and button helps us reach more voters.
          </p>
        </div>
      </header>

      {/* Products */}
      <section className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">Merchandise coming soon.</p>
            <p className="text-sm mt-1">Follow the campaign for updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <article
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div
                  className="aspect-square flex items-center justify-center text-4xl md:text-5xl"
                  style={{ background: brand.primaryColor + "15" }}
                >
                  {emojiForType(p.productType)}
                </div>
                <div className="p-3 md:p-4">
                  <h3 className="font-bold text-slate-900 text-sm md:text-base leading-tight">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{p.productType}</p>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="font-extrabold tabular-nums text-slate-900">
                      ${p.retailPriceCad.toFixed(2)}
                    </span>
                    <button
                      className="h-9 px-3 rounded-lg text-white font-semibold text-xs md:text-sm"
                      style={{ background: brand.accentColor }}
                      disabled
                      title="Checkout coming soon"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs md:text-sm text-slate-500">
        <p>{brand.campaignName} · Fulfilled by Poll City Print</p>
        <p className="mt-2">
          <Link href={`/candidates/${params.slug}`} className="hover:underline font-semibold">About the campaign</Link>
          {" · "}
          <Link href="/" className="hover:underline">poll.city</Link>
        </p>
      </footer>
    </main>
  );
}

function emojiForType(type: string): string {
  const map: Record<string, string> = {
    tshirt: "👕",
    hoodie: "🧥",
    hat: "🧢",
    tote: "👜",
    mug: "☕",
    sticker: "🏷️",
    button: "📛",
    yard_sign: "🪧",
  };
  return map[type] ?? "🎁";
}
