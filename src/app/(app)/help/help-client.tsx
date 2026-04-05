"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, ChevronRight, ArrowLeft, HelpCircle, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { HELP_CATEGORIES, HELP_ARTICLES, searchArticles, type HelpArticle } from "./help-data";

export default function HelpCenterClient() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const searchResults = useMemo(() => (query.trim() ? searchArticles(query) : []), [query]);

  const displayedArticles = useMemo(() => {
    if (query.trim()) return searchResults;
    if (selectedCategory) return HELP_ARTICLES.filter((a) => a.category === selectedCategory);
    return HELP_ARTICLES;
  }, [query, searchResults, selectedCategory]);

  if (selectedArticle) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <button
          onClick={() => setSelectedArticle(null)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to help center
        </button>
        <article className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="mb-4">
            <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              {HELP_CATEGORIES.find((c) => c.id === selectedArticle.category)?.label}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{selectedArticle.title}</h1>
          <p className="text-lg text-gray-600 mb-6">{selectedArticle.excerpt}</p>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {selectedArticle.body.split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-2">
                    {line.replace("## ", "")}
                  </h2>
                );
              }
              if (line.startsWith("- **")) {
                const match = line.match(/^- \*\*(.+?)\*\* (.+)$/);
                if (match) {
                  return (
                    <li key={i} className="list-disc ml-5 mb-1">
                      <strong>{match[1]}</strong> {match[2]}
                    </li>
                  );
                }
              }
              if (line.startsWith("- ")) {
                return (
                  <li key={i} className="list-disc ml-5 mb-1">
                    {line.replace("- ", "")}
                  </li>
                );
              }
              if (/^\d+\. /.test(line)) {
                return (
                  <li key={i} className="list-decimal ml-5 mb-1">
                    {line.replace(/^\d+\. /, "")}
                  </li>
                );
              }
              if (line.trim() === "") {
                return <div key={i} className="h-3" />;
              }
              return (
                <p key={i} className="mb-2">
                  {line}
                </p>
              );
            })}
          </div>
        </article>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Still need help?</p>
            <p className="text-sm text-blue-700">
              Email <a href="mailto:support@poll.city" className="underline">support@poll.city</a> and we'll respond within 1 business day.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <PageHeader
        title="Help Center"
        description="Guides, tutorials, and answers for running your campaign on Poll City."
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {query.trim() && (
          <p className="text-sm text-gray-500 mt-2">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{query}"
          </p>
        )}
      </div>

      {/* Categories */}
      {!query.trim() && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`p-3 rounded-xl text-left transition-colors ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 hover:border-blue-400 text-gray-900"
            }`}
          >
            <div className="text-lg mb-0.5">📚</div>
            <p className="text-sm font-semibold">All articles</p>
            <p className="text-xs opacity-75">{HELP_ARTICLES.length} guides</p>
          </button>
          {HELP_CATEGORIES.map((cat) => {
            const count = HELP_ARTICLES.filter((a) => a.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-xl text-left transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 hover:border-blue-400 text-gray-900"
                }`}
              >
                <div className="text-lg mb-0.5">{cat.emoji}</div>
                <p className="text-sm font-semibold">{cat.label}</p>
                <p className="text-xs opacity-75">
                  {count} guide{count !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Articles */}
      {displayedArticles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">No articles found for "{query}"</p>
          <p className="text-xs text-gray-400">Try different keywords or browse by category.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-[65vh] overflow-y-auto">
          {displayedArticles.map((article) => {
            const cat = HELP_CATEGORIES.find((c) => c.id === article.category);
            return (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3"
              >
                <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900">{article.title}</p>
                    {cat && (
                      <span className="text-xs text-gray-500">
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Contact support */}
      <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">Can't find what you need?</h3>
          <p className="text-sm text-gray-600">
            Our team responds to every support request within 1 business day.
          </p>
        </div>
        <a
          href="mailto:support@poll.city"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl whitespace-nowrap"
        >
          <Mail className="w-4 h-4" /> Contact support
        </a>
        <Link
          href="/how-polling-works"
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold px-4 py-2 rounded-xl whitespace-nowrap"
        >
          <HelpCircle className="w-4 h-4" /> How polling works
        </Link>
      </div>
    </div>
  );
}
