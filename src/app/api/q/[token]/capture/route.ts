/**
 * POST /api/q/[token]/capture — progressive identity capture from the landing page
 * No authentication required. Rate limited (form tier: 5/hour per IP).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { captureIdentity } from "@/lib/qr/capture";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  scanId: z.string().min(1),
  name: z.string().min(1).max(150).optional(),
  email: z.string().email().max(255).optional(),
  phone: z
    .string()
    .max(30)
    .regex(/^[\d\s\-+().]+$/, "Invalid phone number")
    .optional(),
  postalCode: z
    .string()
    .max(10)
    .regex(/^[A-Za-z0-9 -]*$/, "Invalid postal code")
    .optional(),
  address: z.string().max(300).optional(),
  note: z.string().max(1000).optional(),
  signRequested: z.boolean().optional(),
  volunteerInterest: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params: _params }: { params: { token: string } },
) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: NO_STORE });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400, headers: NO_STORE });
  }

  const data = parsed.data;

  // Require at least some identity to proceed
  if (!data.name && !data.email && !data.phone) {
    return NextResponse.json(
      { error: "Provide at least a name, email, or phone number." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await captureIdentity({
      scanId: data.scanId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      postalCode: data.postalCode,
      address: data.address,
      note: data.note,
      signRequested: data.signRequested,
      volunteerInterest: data.volunteerInterest,
    });

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capture failed";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
  }
}
