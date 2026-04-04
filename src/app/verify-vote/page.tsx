"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";

export default function VerifyVotePage() {
  const [receiptCode, setReceiptCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");

  async function verify() {
    const code = receiptCode.trim().toUpperCase();
    if (!code) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/polls/verify-receipt?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.found ? "found" : "not_found");
      } else {
        setStatus("not_found");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Vote</h1>
          <p className="text-gray-500 mt-2">
            Enter the receipt code you received after voting to confirm your vote was counted.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <label htmlFor="receipt" className="block text-sm font-semibold text-gray-700 mb-2">
            Receipt Code
          </label>
          <input
            id="receipt"
            type="text"
            value={receiptCode}
            onChange={(e) => {
              setReceiptCode(e.target.value.toUpperCase());
              setStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={14}
            autoComplete="off"
          />
          <button
            onClick={verify}
            disabled={!receiptCode.trim() || status === "loading"}
            className="w-full mt-4 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>

        {/* Results */}
        {status === "found" && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">Vote confirmed</p>
              <p className="text-sm text-emerald-700 mt-1">
                Your vote was recorded and is included in the poll results. Your identity remains
                anonymous — this verification does not reveal which option you chose.
              </p>
            </div>
          </div>
        )}

        {status === "not_found" && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Receipt not found</p>
              <p className="text-sm text-red-700 mt-1">
                No vote was found matching this receipt code. Please check the code and try again.
                Receipt codes are case-insensitive.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Verification failed</p>
              <p className="text-sm text-amber-700 mt-1">
                Something went wrong. Please check your internet connection and try again.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/how-polling-works"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            How does anonymous polling work?
          </Link>
          <br />
          <Link
            href="/social"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Poll City Social
          </Link>
        </div>
      </div>
    </div>
  );
}
