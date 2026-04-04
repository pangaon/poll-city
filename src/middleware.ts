import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

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
        ];

        if (publicPaths.some(p => path.startsWith(p))) {
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
