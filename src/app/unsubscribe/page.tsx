"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, Mail } from "lucide-react";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const contactId = searchParams?.get("c");
  const email = searchParams?.get("email");
  const [status, setStatus] = useState<"pending" | "processing" | "done" | "error">("pending");

  async function handleUnsubscribe() {
    setStatus("processing");
    try {
      const res = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId, email }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center">
          {status === "pending" && (
            <>
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
                <Mail className="w-7 h-7 text-slate-500" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Unsubscribe</h1>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                You&apos;re requesting to stop receiving campaign communications.
                {email && <span className="block mt-1 font-medium text-slate-700">{email}</span>}
              </p>
              <button
                onClick={handleUnsubscribe}
                className="mt-6 w-full h-11 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Confirm Unsubscribe
              </button>
              <p className="text-xs text-slate-400 mt-4">
                This will mark your contact as &quot;Do Not Contact&quot; and remove you from all future email and SMS campaigns from this campaign.
              </p>
            </>
          )}

          {status === "processing" && (
            <div className="py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Processing your request...</p>
            </div>
          )}

          {status === "done" && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Unsubscribed</h1>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                You&apos;ve been removed from all future campaign communications. You will no longer receive emails or text messages from this campaign.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Something Went Wrong</h1>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                We couldn&apos;t process your unsubscribe request. Please try again or contact the campaign directly.
              </p>
              <button
                onClick={() => setStatus("pending")}
                className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          <Link href="/" className="hover:text-slate-600">Poll City</Link> · CASL Compliant
        </p>
      </div>
    </div>
  );
}
