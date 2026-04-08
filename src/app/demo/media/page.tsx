import { Metadata } from "next";
import { validateDemoToken } from "@/lib/demo/validate-token";
import MediaDemoClient from "./media-demo-client";

export const metadata: Metadata = { title: "Election Night Demo — Poll City" };

export default async function MediaDemoPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const result = await validateDemoToken(token);

  if (!result.valid) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Demo Link Expired</h1>
          <p className="text-slate-400 mb-6">
            This demo link has expired or is invalid. Request a fresh link from your Poll City contact.
          </p>
          <a
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
          >
            Visit Demo Page
          </a>
        </div>
      </div>
    );
  }

  return <MediaDemoClient prospectName={result.prospectName ?? null} />;
}
