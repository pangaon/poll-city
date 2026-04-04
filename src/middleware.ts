import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export default withAuth(
  async function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;
    const hostname = req.headers.get("host") || "";

    // Check for custom domains
    if (process.env.NEXT_PUBLIC_ROOT_DOMAIN && hostname !== process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
      // This is a custom domain - find the campaign
      const campaign = await prisma.campaign.findUnique({
        where: { customDomain: hostname },
        select: { slug: true },
      });

      if (campaign) {
        // Redirect to the candidate page
        const url = new URL(`/candidates/${campaign.slug}`, req.url);
        return NextResponse.redirect(url);
      }
    }

    // Redirect authenticated users away from login
    if (path === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Explicitly public paths — no auth required
        const publicPaths = [
          "/login",
          "/api/auth",
          "/social",
          "/api/polls",       // public poll listing and voting
          "/api/officials",   // public official profiles and Q&A
          "/api/geo",         // postal code lookup for Social discover
          "/api/social",      // social signals (auth handled inside route)
          "/candidates",      // public candidate pages
          "/api/public",      // public API routes
          "/terms",
          "/privacy-policy",
          "/pricing",
        ];

        // Root marketing site is always public
        if (path === "/" || publicPaths.some(p => path.startsWith(p))) {
          return true;
        }

        // Everything else requires a valid session token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|public/).*)"],
};
