import { NextRequest, NextResponse } from "next/server";
import { DEBUG_ACCESS_COOKIE } from "@/lib/debug/access";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const secret = process.env.DEBUG_SECRET_KEY ?? "";

  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  const response = NextResponse.json({ activated: true });
  response.cookies.set(DEBUG_ACCESS_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: THIRTY_DAYS,
    path: "/",
  });

  return response;
}
