import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

interface NominatimResult {
  display_name: string;
  type: string;
  addresstype: string;
  address: {
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${q}, Canada`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("featuretype", "city");
    // Only cities, towns, municipalities
    url.searchParams.set("countrycodes", "ca");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "PollCity/1.0 (contact@poll.city)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as NominatimResult[];

    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const item of data) {
      // Build clean label: city/town name + province
      const cityName =
        item.address.city ??
        item.address.town ??
        item.address.municipality ??
        item.display_name.split(",")[0].trim();
      const province = item.address.state ?? "";
      const label = province ? `${cityName}, ${province}` : cityName;

      if (!seen.has(label)) {
        seen.add(label);
        suggestions.push(cityName); // return just the city name for use in the search
      }
    }

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
