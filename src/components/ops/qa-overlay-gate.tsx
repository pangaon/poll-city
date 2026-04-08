import { getSession } from "@/lib/auth/helpers";
import { QaOverlay } from "@/components/ops/qa-overlay";

export default async function QaOverlayGate() {
  const session = await getSession();
  if (session?.user?.role !== "SUPER_ADMIN") return null;
  return <QaOverlay />;
}
