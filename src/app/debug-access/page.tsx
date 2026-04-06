"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DebugAccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const key = params.get("key");

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      if (!key) {
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch(`/api/debug/activate?key=${encodeURIComponent(key)}`);
        const data = (await response.json().catch(() => ({}))) as { activated?: boolean };
        if (cancelled) return;

        if (response.ok && data.activated) {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setStatus("failed");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    activate();
    return () => {
      cancelled = true;
    };
  }, [key, router]);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
        <p>Checking access...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-6 text-center text-gray-100">
        <div>
          <div className="mb-4 text-4xl">BUG</div>
          <p className="font-semibold text-green-400">Debug mode activated</p>
          <p className="mt-2 text-sm text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
      <p>Page not found.</p>
    </div>
  );
}
