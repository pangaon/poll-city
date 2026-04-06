import DebugToolbarGate from "@/components/debug/debug-toolbar-gate";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DebugToolbarGate />
    </>
  );
}
