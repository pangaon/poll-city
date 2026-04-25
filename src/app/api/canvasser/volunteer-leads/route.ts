import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCanvasserContext } from "@/lib/canvasser/context";
import { volunteerService } from "@/lib/canvasser/service";

const bodySchema = z.object({
  campaignId: z.string().min(1).optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  availability: z.string().optional(),
  hasCar: z.boolean().optional(),
  preferredRoles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional(),
  contactId: z.string().optional(),
  sourceStopId: z.string().optional(),
  consentToContact: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 422 });

  const { ctx, error } = await resolveCanvasserContext(req, parsed.data.campaignId ?? null, "volunteers:write");
  if (error || !ctx) return error;

  try {
    const data = await volunteerService.createVolunteerLead(ctx.userId, ctx.campaignId, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Volunteer lead creation failed";
    const status = message.includes("DUPLICATE") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
