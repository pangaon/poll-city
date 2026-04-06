import type { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://poll.city";
  const now = new Date();

  const staticPages = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/officials", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/social", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/social/officials", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/social/polls", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/resources", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/help", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/how-polling-works", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/verify-vote", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/login", priority: 0.4, changeFrequency: "monthly" as const },
  ];

  // Dynamic: public candidate pages
  let candidatePages: MetadataRoute.Sitemap = [];
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isPublic: true, isActive: true },
      select: { slug: true, updatedAt: true },
    });
    candidatePages = campaigns.map((c) => ({
      url: `${base}/candidates/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — skip dynamic pages
  }

  // Dynamic: official profiles
  let officialPages: MetadataRoute.Sitemap = [];
  try {
    const officials = await prisma.official.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      take: 5000,
    });
    officialPages = officials.map((o) => ({
      url: `${base}/social/officials/${o.id}`,
      lastModified: o.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unavailable — skip
  }

  return [
    ...staticPages.map((p) => ({
      url: `${base}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...candidatePages,
    ...officialPages,
  ];
}