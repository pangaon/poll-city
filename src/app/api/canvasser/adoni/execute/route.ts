/**
 * POST /api/canvasser/adoni/execute
 * Executes confirmed parsed actions from the Adoni voice flow.
 * The canvasser must confirm each action before it reaches this endpoint.
 *
 * Body: {
 *   campaignId: string
 *   contactId?: string
 *   stopId?: string
 *   actions: ConfirmedAction[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set_support_level"),
    params: z.object({
      supportLevel: z.enum([
        "strong_support",
        "leaning_support",
        "undecided",
        "leaning_opposition",
        "strong_opposition",
        "unknown",
      ]),
      contactId: z.string(),
    }),
  }),
  z.object({
    type: z.literal("request_sign"),
    params: z.object({ contactId: z.string() }),
  }),
  z.object({
    type: z.literal("flag_volunteer"),
    params: z.object({ contactId: z.string() }),
  }),
  z.object({
    type: z.literal("flag_follow_up"),
    params: z.object({ contactId: z.string() }),
  }),
  z.object({
    type: z.literal("mark_do_not_contact"),
    params: z.object({ contactId: z.string() }),
  }),
  z.object({
    type: z.literal("skip_stop"),
    params: z.object({ stopId: z.string().optional(), contactId: z.string().optional() }),
  }),
  z.object({
    type: z.literal("add_note"),
    params: z.object({ contactId: z.string().optional(), note: z.string() }),
  }),
]);

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().optional(),
  stopId: z.string().optional(),
  actions: z.array(actionSchema).min(1).max(10),
});

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { campaignId, contactId, stopId, actions } = parsed.data;

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ type: string; success: boolean; error?: string }> = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "set_support_level": {
          await prisma.contact.update({
            where: { id: action.params.contactId },
            data: {
              supportLevel: action.params.supportLevel,
              lastContactedAt: new Date(),
            },
          });
          break;
        }

        case "request_sign": {
          const contact = await prisma.contact.findFirst({
            where: { id: action.params.contactId, campaignId, deletedAt: null },
            select: { firstName: true, lastName: true, address1: true, email: true },
          });
          if (contact) {
            await prisma.$transaction([
              prisma.signRequest.create({
                data: {
                  campaignId,
                  address: contact.address1 ?? "Unknown",
                  name: `${contact.firstName} ${contact.lastName}`,
                  email: contact.email ?? "",
                },
              }),
              prisma.contact.update({
                where: { id: action.params.contactId },
                data: { signRequested: true },
              }),
            ]);
          }
          break;
        }

        case "flag_volunteer": {
          await prisma.contact.update({
            where: { id: action.params.contactId },
            data: { volunteerInterest: true },
          });
          break;
        }

        case "flag_follow_up": {
          await prisma.contact.update({
            where: { id: action.params.contactId },
            data: { followUpNeeded: true },
          });
          break;
        }

        case "mark_do_not_contact": {
          await prisma.contact.update({
            where: { id: action.params.contactId },
            data: { doNotContact: true },
          });
          break;
        }

        case "skip_stop": {
          const sid = action.params.stopId ?? stopId;
          if (sid) {
            await prisma.turfStop.update({
              where: { id: sid },
              data: { visited: true, visitedAt: new Date(), notes: "[SKIPPED via Adoni]" },
            });
          }
          break;
        }

        case "add_note": {
          const cid = action.params.contactId ?? contactId;
          if (cid && action.params.note) {
            await prisma.interaction.create({
              data: {
                contactId: cid,
                userId: session!.user.id,
                type: "note",
                source: "canvass",
                notes: action.params.note as string,
                issues: [],
              },
            });
          }
          break;
        }
      }

      results.push({ type: action.type, success: true });
    } catch (err) {
      results.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const allSuccess = results.every((r) => r.success);
  return NextResponse.json(
    { data: { results, allSuccess } },
    { status: allSuccess ? 200 : 207 },
  );
}
