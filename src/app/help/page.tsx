import { getPublishedArticles, getCategoryCatalog } from "@/lib/help-center/store";
import { HelpSearchBar } from "@/components/help/search-bar";
import { ArticleCard } from "@/components/help/article-card";
import PublicNav from "@/components/layout/public-nav";

export const metadata = {
  title: "Help Center — Poll City",
  description: "Videos and articles for campaign operations in Poll City.",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const articles = await getPublishedArticles();
  const categories = getCategoryCatalog().map((category) => {
    const matches = articles.filter((article) => article.category === category.id);
    const videos = matches.filter((article) => !!article.videoUrl).length;
    return {
      ...category,
      count: matches.length,
      videos,
    };
  });

  const featured = articles.slice(0, 3);

  return (
    <>
    <PublicNav />
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">Help Center</h1>
        <p className="text-slate-600">Search guides and watch verified walkthrough videos from the field.</p>
        <HelpSearchBar />
      </header>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xl">{category.icon}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{category.name}</p>
              <p className="text-xs text-slate-600 mt-1">{category.count} articles · {category.videos} videos</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Featured</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {featured.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">All Articles</h2>
        {categories.map((category) => {
          const items = articles.filter((article) => article.category === category.id);
          if (items.length === 0) return null;

          return (
            <div key={category.id} className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{category.icon} {category.name}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {items.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
    </>
  );
}
