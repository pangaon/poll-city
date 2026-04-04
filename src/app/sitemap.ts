import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://poll.city";
  const now = new Date();

  const publicPages = [
    "",
    "/pricing",
    "/officials",
    "/social",
    "/social/officials",
    "/social/polls",
    "/social/profile",
    "/terms",
    "/privacy-policy",
    "/login",
  ];

  return publicPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}