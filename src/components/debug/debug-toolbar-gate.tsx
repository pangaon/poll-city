import { canRenderDebugToolbarServer } from "@/lib/debug/access";
import { DebugToolbar } from "@/components/debug/debug-toolbar";

export default async function DebugToolbarGate() {
  const enabled = await canRenderDebugToolbarServer();
  if (!enabled) return null;

  return <DebugToolbar />;
}
