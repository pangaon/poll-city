import { NextResponse } from "next/server";

export async function GET() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const appleEnabled = Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET);

  return NextResponse.json({
    data: {
      googleEnabled,
      appleEnabled,
    },
  });
}