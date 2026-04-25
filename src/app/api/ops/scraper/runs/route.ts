import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ── Toronto CKAN scraper (inlined to avoid cross-directory imports) ──────────

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const RESULT_PACKAGE_IDS = ["election-results-unofficial", "election-results-official"];

interface CkanResource { url: string; name: string; format: string }
interface CkanPackage  { title: string; name: string; resources: CkanResource[] }
interface CkanApiResp  { success: boolean; result: CkanPackage }

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json() as Promise<T>;
}

async function discoverPackage(): Promise<CkanPackage | null> {
  for (const id of RESULT_PACKAGE_IDS) {
    const resp = await fetchJson<CkanApiResp>(`${CKAN_BASE}/api/3/action/package_show?id=${id}`);
    if (resp.success && resp.result) return resp.result;
  }
  return null;
}

function pickJsonResource(pkg: CkanPackage): { url: string } | null {
  const jsonRes = pkg.resources.filter(r => r.format.toLowerCase() === "json");
  if (!jsonRes.length) return null;
  return jsonRes.find(r => !r.name.toLowerCase().includes("wardbyward")) ?? jsonRes[0];
}

function detectYear(pkg: CkanPackage): number {
  const text = [pkg.title, pkg.name, ...pkg.resources.map(r => r.name)].join(" ");
  const m = text.match(/20\d{2}/);
  return m ? parseInt(m[0], 10) : new Date().getFullYear();
}

interface CandidateRow {
  candidateName: string; office: string; ward: string | null;
  wardNumber: number | null; municipality: string; province: string;
  electionYear: number; rawData: Record<string, unknown>;
}

interface CkanCandidate { name: string; [k: string]: unknown }
interface CkanWard      { num?: string; name?: string; candidate?: CkanCandidate[] }
interface CkanOffice    { name: string; ward?: CkanWard[]; candidate?: CkanCandidate[] }
interface CkanResults   { office: CkanOffice[] }

function parseResults(data: CkanResults, year: number): CandidateRow[] {
  const out: CandidateRow[] = [];
  for (const office of (Array.isArray(data.office) ? data.office : [data.office])) {
    if (!office?.name) continue;
    const wards = office.ward?.length ? office.ward : [null];
    for (const ward of wards) {
      const wardName = ward?.name ?? null;
      const wardNum  = ward?.num ? parseInt(ward.num, 10) : null;
      for (const c of (ward?.candidate ?? office.candidate ?? [])) {
        if (!c.name) continue;
        out.push({
          candidateName: c.name,
          office: office.name,
          ward: wardName,
          wardNumber: wardNum,
          municipality: "toronto",
          province: "ON",
          electionYear: year,
          rawData: { officeName: office.name, wardName, wardNum, ...c },
        });
      }
    }
  }
  return out;
}

// ── GET /api/ops/scraper/runs ────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const runs = await prisma.muniScrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true, municipality: true, province: true, strategy: true,
      status: true, rawCount: true, error: true,
      startedAt: true, completedAt: true, sourceUrl: true,
    },
  });

  return NextResponse.json({ runs });
}

// ── POST /api/ops/scraper/runs ───────────────────────────────────────────────

const TriggerBody = z.object({
  municipality: z.string().min(1).toLowerCase(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = TriggerBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { municipality } = parsed.data;

  if (municipality !== "toronto") {
    return NextResponse.json({ error: `No scraper implemented for "${municipality}". Available: toronto` }, { status: 400 });
  }

  const run = await prisma.muniScrapeRun.create({
    data: { municipality, province: "ON", sourceUrl: "pending", strategy: "ckan", status: "running" },
  });

  try {
    const pkg = await discoverPackage();
    if (!pkg) throw new Error("Could not find election results package on Toronto CKAN");

    const resource = pickJsonResource(pkg);
    if (!resource) throw new Error("No JSON resource found in package");

    await prisma.muniScrapeRun.update({ where: { id: run.id }, data: { sourceUrl: resource.url } });

    const year      = detectYear(pkg);
    const data      = await fetchJson<CkanResults>(resource.url);
    const candidates = parseResults(data, year);

    const BATCH = 100;
    for (let i = 0; i < candidates.length; i += BATCH) {
      await prisma.rawMuniCandidate.createMany({
        data: candidates.slice(i, i + BATCH).map(c => ({
          runId: run.id,
          municipality: c.municipality,
          province: c.province,
          electionYear: c.electionYear,
          office: c.office,
          ward: c.ward,
          wardNumber: c.wardNumber,
          candidateName: c.candidateName,
          rawData: c.rawData as Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
    }

    const updated = await prisma.muniScrapeRun.update({
      where: { id: run.id },
      data: { status: "completed", rawCount: candidates.length, completedAt: new Date() },
    });

    return NextResponse.json({ run: updated, candidatesFound: candidates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.muniScrapeRun.update({
      where: { id: run.id },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
    return NextResponse.json({ error: message, runId: run.id }, { status: 500 });
  }
}
