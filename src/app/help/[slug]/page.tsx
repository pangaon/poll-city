import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getPublishedArticles } from "@/lib/help-center/store";
import { VideoPlayer } from "@/components/help/video-player";
import { FeedbackWidget } from "@/components/help/feedback-widget";
import { AskAdoniButton } from "@/components/help/ask-adoni-button";
import { ArticleCard } from "@/components/help/article-card";

function difficultyClass(difficulty: string) {
  if (difficulty === "Beginner") return "bg-emerald-100 text-emerald-800";
  if (difficulty === "Intermediate") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function renderMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  return lines.map((line, index) => {
    if (line.startsWith("# ")) return <h2 key={index} className="text-2xl font-bold text-slate-900 mt-4">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={index} className="text-xl font-semibold text-slate-900 mt-4">{line.slice(3)}</h3>;
    if (/^\d+\.\s/.test(line)) return <li key={index} className="ml-5 list-decimal text-slate-700">{line.replace(/^\d+\.\s/, "")}</li>;
    if (line.startsWith("- ")) return <li key={index} className="ml-5 list-disc text-slate-700">{line.slice(2)}</li>;
    if (!line.trim()) return <div key={index} className="h-2" />;
    return <p key={index} className="text-slate-700 leading-7">{line}</p>;
  });
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);
  if (!article || !article.published) notFound();

  const related = (await getPublishedArticles())
    .filter((item) => item.slug !== article.slug && item.category === article.category)
    .slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <main className="space-y-6">
          <nav className="text-sm text-slate-600">
            <Link href="/help" className="hover:underline">Help</Link>
            <span className="mx-2">/</span>
            <span>{article.title}</span>
          </nav>

          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{article.readTimeMinutes} min read</span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full ${difficultyClass(article.difficulty)}`}>{article.difficulty}</span>
              {article.lastVerified && (
                <>
                  <span>·</span>
                  <span>Last verified {new Date(article.lastVerified).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </header>

          <VideoPlayer
            videoUrl={article.videoUrl}
            thumbnailUrl={article.thumbnailUrl}
            duration={article.duration}
            title={article.title}
          />

          <article className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 md:p-6">{renderMarkdown(article.content)}</article>

          <FeedbackWidget slug={article.slug} />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Related articles</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {related.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </div>
          </section>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <AskAdoniButton title={article.title} />
          </div>
        </aside>
      </div>

      <div className="lg:hidden">
        <AskAdoniButton title={article.title} mobileSticky />
      </div>
    </div>
  );
}
