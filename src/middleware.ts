import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/db/prisma";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/social",
  "/api/polls",
  "/api/officials",
  "/api/geo",
  "/api/social",
  "/candidates",
  "/api/public",
  "/terms",
  "/privacy-policy",
  "/pricing",
  "/officials",
  "/how-polling-works",
  "/verify-vote",
  "/api/polls/verify-receipt",
];

function isPublicPath(path: string) {
  return path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hostname = req.headers.get("host") || "";

  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN && hostname !== process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    const campaign = await prisma.campaign.findUnique({
      where: { customDomain: hostname },
      select: { slug: true },
    });

    if (campaign) {
      const url = new URL(`/candidates/${campaign.slug}`, req.url);
      return NextResponse.redirect(url);
    }
  }

  if (path === "/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path === "/") {
    return NextResponse.next();
  }

  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|icon|apple-touch-icon|sw.js|manifest.json|robots.txt|sitemap.xml).*)",
  ],
};
