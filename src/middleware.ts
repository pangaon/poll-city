import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Inline injection detection (Edge-compatible — no Node imports) ─────────

const SQL_PATTERNS = [
  /(\bSELECT\b.*\bFROM\b|\bINSERT\b.*\bINTO\b|\bUPDATE\b.*\bSET\b|\bDELETE\b.*\bFROM\b|\bDROP\b\s+\bTABLE\b|\bUNION\b.*\bSELECT\b)/i,
  /(1\s*=\s*1|'\s*OR\s*'|"\s*OR\s*"|;\s*--)/i,
];
const XSS_PATTERNS = [/<script\b/i, /javascript\s*:/i, /\bon\w+\s*=/i, /<iframe\b/i, /<object\b/i];

function detectInjectionInMiddleware(input: string): boolean {
  return [...SQL_PATTERNS, ...XSS_PATTERNS].some((p) => p.test(input));
}

const BLOCKED_AGENTS = ["sqlmap", "nikto", "nmap", "masscan", "dirbuster", "gobuster", "wfuzz", "hydra"];

function isBlockedAgent(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BLOCKED_AGENTS.some((a) => lower.includes(a));
}

// ─── Public paths ───────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/accept-invite",
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
  "/sentiment",
  "/api/polls/verify-receipt",
  "/demo",
  "/about",
  "/contact",
  "/unsubscribe",
  "/api/resources",
  "/api/health",
  "/reset-password",
  "/store",
  "/api/v1/approval",
  "/api/ticker",
  "/api/results",
  "/api/civic",
  "/api/webhooks",
  "/api/ops/demos",
  "/api/tv",
  "/api/cron",
  "/api/autonomous",
  "/api/stripe/webhook",
  "/api/voice/webhook",
  "/api/call-center/webhook",
  "/api/volunteer/onboard",
  "/api/calendar",
  "/api/help",
  "/api/domain-lookup",
  "/claim",
  "/api/auth/claim-profile",
  "/vendor/signup",
  "/api/vendor/signup",
];

function isPublicPath(path: string) {
  return path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hostname = req.headers.get("host") || "";

  // ─── Security: block known attack tools ───────────────────────────────────
  const userAgent = req.headers.get("user-agent") || "";
  if (isBlockedAgent(userAgent)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─── Security: check query params for injection on API routes ─────────────
  if (path.startsWith("/api/")) {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const paramValues = Object.values(params);
    for (let i = 0; i < paramValues.length; i++) {
      if (detectInjectionInMiddleware(paramValues[i])) {
        console.error(`[Security] Injection attempt in query param on ${path}:`, paramValues[i].slice(0, 80));
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
    }
  }

  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN && hostname !== process.env.NEXT_PUBLIC_ROOT_DOMAIN && !path.startsWith("/api/domain-lookup")) {
    try {
      const lookupUrl = new URL("/api/domain-lookup", req.nextUrl.origin);
      lookupUrl.searchParams.set("hostname", hostname);
      const res = await fetch(lookupUrl.toString());
      if (res.ok) {
        const { slug } = await res.json() as { slug: string };
        const url = new URL(`/candidates/${slug}`, req.url);
        return NextResponse.redirect(url);
      }
    } catch {
      // domain lookup failed — continue normally
    }
  }

  if (path === "/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      if (token.role === "PRINT_VENDOR") {
        return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (path === "/") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      if (token.role === "PRINT_VENDOR") {
        return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Mobile app sends Bearer token — let API routes through, the route handler validates it
    const authHeader = req.headers.get("authorization");
    if (path.startsWith("/api/") && authHeader?.startsWith("Bearer ")) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2FA step-up: if password is verified but second factor isn't, the only
  // pages the user can reach are the verify page and the API it calls.
  const requires2FA = Boolean(token.requires2FA);
  const twoFactorVerified = Boolean(token.twoFactorVerified);
  if (requires2FA && !twoFactorVerified) {
    const isVerifyPage = path === "/2fa-verify";
    const isVerifyApi = path.startsWith("/api/auth/2fa/verify") || path.startsWith("/api/auth/2fa/setup");
    const isLogout = path.startsWith("/api/auth/signout") || path.startsWith("/api/auth/session");
    if (!isVerifyPage && !isVerifyApi && !isLogout) {
      const url = new URL("/2fa-verify", req.url);
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Print vendor role: restrict to vendor portal + API only
  if (token.role === "PRINT_VENDOR") {
    const VENDOR_ALLOWED_PREFIXES = [
      "/vendor",
      "/api/vendor",
      "/api/auth",
      "/settings",
    ];
    const isAllowed = VENDOR_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
    }
  }

  // Finance role: restrict to finance-relevant pages only
  if (token.role === "FINANCE") {
    const FINANCE_ALLOWED_PREFIXES = [
      "/finance",
      "/donations",
      "/settings",
      "/billing",
      "/notifications",
      "/api/",
      "/briefing",
      "/pcapp",
    ];
    const isAllowed = FINANCE_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/finance", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|icon|apple-touch-icon|sw.js|manifest.json|robots.txt|sitemap.xml).*)",
  ],
};
