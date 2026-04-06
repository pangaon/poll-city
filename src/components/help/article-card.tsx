import Link from "next/link";

type Article = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  readTimeMinutes: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  videoUrl: string | null;
  lastVerified: string | null;
};

function difficultyClass(difficulty: Article["difficulty"]) {
  if (difficulty === "Beginner") return "bg-emerald-100 text-emerald-800";
  if (difficulty === "Intermediate") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/help/${article.slug}`} className="block rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow">
      <h3 className="text-base font-semibold text-slate-900">{article.title}</h3>
      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{article.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{article.readTimeMinutes} min read</span>
        <span className={`px-2 py-0.5 rounded-full ${difficultyClass(article.difficulty)}`}>{article.difficulty}</span>
        {article.videoUrl && <span>📹 Video</span>}
        {article.lastVerified && <span>Verified {new Date(article.lastVerified).toLocaleDateString()}</span>}
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Ask Adoni</span>
      </div>
    </Link>
  );
}
