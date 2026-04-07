import prisma from "@/lib/db/prisma";

interface SignalParams {
  deviceId: string;
  officialId: string;
  signalType: string;
  rawSentiment: number; // -1.0 to 1.0
  source?: string;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget. Never blocks UI. Never fails visibly.
export async function collectSignal(params: SignalParams): Promise<void> {
  try {
    // Ensure actor exists (upsert by deviceId)
    await prisma.anonymousCivicActor.upsert({
      where: { deviceId: params.deviceId },
      create: { deviceId: params.deviceId },
      update: {},
    });

    // Record the signal
    await prisma.sentimentSignal.create({
      data: {
        officialId: params.officialId,
        type: params.signalType,
        value: Math.max(-1, Math.min(1, params.rawSentiment)),
        weight: 1.0, // ATLAS sets real weights in private repo
        source: params.source ?? "social_poll",
        metadata: (params.metadata as object) ?? {},
      },
    });
  } catch {
    // Fire and forget — never fail visibly
  }
}
