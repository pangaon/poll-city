import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/db/prisma";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Canadian Political Sentiment — Live | Poll City",
  description: "Live approval ratings for every Canadian elected official. Updated in real time from voter sentiment signals.",
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface LeaderboardEntry {
  officialId: string;
  score: number;
  netScore: number;
  totalSignals: number;
  official: {
    id: string; name: string; title: string | null; district: string;
    province: string | null; level: string; partyName: string | null; photoUrl: string | null;
  };
}

async function fetchData() {
  // Top and bottom approvals
  const [top, bottom, totalOfficials, totalSignals, nationalRatings] = await Promise.all([
    prisma.approvalRating.findMany({
      where: { totalSignals: { gte: 10 } },
      include: {
        official: {
          select: { id: true, name: true, title: true, district: true, province: true, level: true, partyName: true, photoUrl: true },
        },
      },
      orderBy: { score: "desc" },
      take: 10,
    }),
    prisma.approvalRating.findMany({
      where: { totalSignals: { gte: 10 } },
      include: {
        official: {
          select: { id: true, name: true, title: true, district: true, province: true, level: true, partyName: true, photoUrl: true },
        },
      },
      orderBy: { score: "asc" },
      take: 5,
    }),
    prisma.official.count({ where: { isActive: true } }),
    prisma.sentimentSignal.count(),
    prisma.approvalRating.findMany({
      select: { score: true, totalSignals: true, official: { select: { level: true } } },
    }),
  ]);

  // National mood averages per level
  const levelAverages: Record<string, { sum: number; count: number; totalSignals: number }> = {
    federal: { sum: 0, count: 0, totalSignals: 0 },
    provincial: { sum: 0, count: 0, totalSignals: 0 },
    municipal: { sum: 0, count: 0, totalSignals: 0 },
  };

  for (const r of nationalRatings) {
    const level = r.official.level;
    if (levelAverages[level]) {
      levelAverages[level].sum += r.score * r.totalSignals;
      levelAverages[level].count += 1;
      levelAverages[level].totalSignals += r.totalSignals;
    }
  }

  const nationalMood = Object.entries(levelAverages).map(([level, v]) => ({
    level,
    avgScore: v.totalSignals > 0 ? Math.round((v.sum / v.totalSignals) * 10) / 10 : 0,
    officialCount: v.count,
    signalCount: v.totalSignals,
  }));

  const overallSignals = nationalMood.reduce((a, b) => a + b.signalCount, 0);
  const overallScore = overallSignals > 0
    ? Math.round((nationalMood.reduce((a, b) => a + b.avgScore * b.signalCount, 0) / overallSignals) * 10) / 10
    : 50;

  return {
    top: top as unknown as LeaderboardEntry[],
    bottom: bottom as unknown as LeaderboardEntry[],
    totalOfficials,
    totalSignals,
    nationalMood,
    overallScore,
  };
}

function OfficialRow({ entry, rank, showDelta }: { entry: LeaderboardEntry; rank: number; showDelta?: boolean }) {
  const scoreColour = entry.score >= 70 ? "text-emerald-600" : entry.score >= 50 ? "text-green-600" : entry.score >= 35 ? "text-amber-600" : "text-red-600";
  return (
    <Link
      href={`/officials/${entry.officialId}`}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
    >
      <span className="text-sm font-bold text-gray-400 w-6 text-right">{rank}</span>
      {entry.official.photoUrl ? (
        <Image
          src={entry.official.photoUrl}
          alt={entry.official.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-gray-500">
            {entry.official.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{entry.official.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {entry.official.title} · {entry.official.district}
          {entry.official.province && ` · ${entry.official.province}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-2xl font-extrabold ${scoreColour}`}>{Math.round(entry.score)}</p>
        <p className="text-[10px] text-gray-400">{entry.totalSignals} signals</p>
      </div>
    </Link>
  );
}

export default async function SentimentPage() {
  const data = await fetchData();
  const moodColour = data.overallScore >= 65 ? "text-emerald-600" : data.overallScore >= 45 ? "text-amber-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Live · Updates every 60 seconds</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Canadian Political Sentiment</h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Real-time approval ratings for every Canadian elected official. Calculated from voter sentiment signals
            across polls, support, and engagement.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* National Mood */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">🇨🇦 National Mood</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-center">
                <p className={`text-6xl font-extrabold ${moodColour}`}>{Math.round(data.overallScore)}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">Overall Approval</p>
                <p className="text-xs text-gray-400">{data.totalSignals.toLocaleString()} signals across {data.totalOfficials.toLocaleString()} officials</p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                {data.nationalMood.map((m) => (
                  <div key={m.level} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className={`text-2xl font-bold ${m.avgScore >= 65 ? "text-emerald-600" : m.avgScore >= 45 ? "text-amber-600" : "text-red-600"}`}>
                      {m.avgScore > 0 ? Math.round(m.avgScore) : "—"}
                    </p>
                    <p className="text-xs font-semibold text-gray-700 capitalize">{m.level}</p>
                    <p className="text-[10px] text-gray-400">{m.officialCount} officials</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Top and Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Highest Approval
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {data.top.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No officials yet have enough signals to rank. Sentiment will appear as voters engage.
                </div>
              ) : (
                data.top.map((entry, i) => (
                  <OfficialRow key={entry.officialId} entry={entry} rank={i + 1} />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
              Lowest Approval
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {data.bottom.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No officials yet have enough signals to rank.
                </div>
              ) : (
                data.bottom.map((entry, i) => (
                  <OfficialRow key={entry.officialId} entry={entry} rank={i + 1} />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Methodology footer */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-2">How approval is calculated</h3>
          <p className="text-sm text-gray-600 mb-3">
            Poll City uses a weighted blend of real voter sentiment signals:
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• <strong>40%</strong> — Poll votes on Poll City Social</li>
            <li>• <strong>25%</strong> — Support signals from candidate pages</li>
            <li>• <strong>15%</strong> — Question sentiment (AI-analyzed)</li>
            <li>• <strong>10%</strong> — Follow / unfollow behaviour</li>
            <li>• <strong>10%</strong> — Canvassing interaction data</li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            This is an opt-in online sentiment tracker, not a probability sample. Results reflect engaged voters who interact with Poll City Social.
            Scores only appear for officials with ≥10 signals.
          </p>
        </section>
      </div>
    </div>
  );
}
