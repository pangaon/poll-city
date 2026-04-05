"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";

// Mobile-first 2FA step-up page.
// - 6-digit code input with auto-advance and paste support
// - Shows live countdown to next TOTP rotation (30s window)
// - "Use backup code" fallback
// - Works in PWA on iPhone/Android

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { update } = useSession();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown for TOTP window
  useEffect(() => {
    if (useBackup) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsLeft(30 - (now % 30));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [useBackup]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (!useBackup) inputsRef.current[0]?.focus();
  }, [useBackup]);

  async function submit(code: string, backup: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: code, useBackup: backup }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setDigits(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
        return;
      }
      await update({ twoFactorVerified: true });
      router.push(callbackUrl);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    // Handle paste
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split("");
      const next = [...digits];
      for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
      setDigits(next);
      const full = next.join("");
      if (full.length === 6) submit(full, false);
      else inputsRef.current[Math.min(clean.length, 5)]?.focus();
      return;
    }
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (index < 5) inputsRef.current[index + 1]?.focus();
    const full = next.join("");
    if (full.length === 6) submit(full, false);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50"
      style={{ paddingTop: "max(env(safe-area-inset-top), 2rem)", paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-blue-700" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900">Two-factor verification</h1>
        <p className="text-sm text-center text-slate-600 mt-2">
          {useBackup
            ? "Enter one of your saved backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </p>

        {!useBackup ? (
          <>
            <div className="flex justify-center gap-2 mt-6" onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/^\d{6}$/.test(text)) {
                e.preventDefault();
                handleDigit(0, text);
              }
            }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className="w-11 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 tabular-nums"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-slate-500 mt-3 tabular-nums">
              New code in {secondsLeft}s
            </p>
          </>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              disabled={loading}
              className="w-full h-14 text-center text-xl font-mono tracking-widest border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={() => submit(backupCode, true)}
              disabled={loading || backupCode.replace(/-/g, "").length < 8}
              className="w-full h-12 rounded-lg bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify backup code"}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
          <button
            onClick={() => {
              setUseBackup((v) => !v);
              setError(null);
              setDigits(["", "", "", "", "", ""]);
              setBackupCode("");
            }}
            className="w-full text-sm font-semibold text-blue-700 hover:text-blue-900 flex items-center justify-center gap-2 h-11"
          >
            {useBackup ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                Use authenticator app instead
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Use a backup code
              </>
            )}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-sm text-slate-500 hover:text-slate-700 h-11"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
