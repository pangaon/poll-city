"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Stage =
  | "loading"      // validating token
  | "invalid"      // token not found
  | "expired"      // token expired
  | "used"         // already consumed
  | "revoked"      // revoked by operator
  | "existing"     // user already has an account — just go sign in
  | "form"         // show set-password form
  | "submitting"
  | "done";

interface InviteInfo {
  email: string;
  name: string | null;
  isNewUser: boolean;
  hasRealAccount: boolean;
  campaign: {
    id: string;
    name: string;
    candidateName: string | null;
    electionType: string;
  };
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStage("invalid"); return; }

    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { data?: InviteInfo; error?: string }) => {
        if (d.data) {
          setInvite(d.data);
          // If user already has a real account, no need to set password
          setStage(d.data.hasRealAccount ? "existing" : "form");
        } else {
          setStage((d.error as Stage) ?? "invalid");
        }
      })
      .catch(() => setStage("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setGeneralError("");

    if (password !== confirm) {
      setErrors(["Passwords do not match."]);
      return;
    }

    setStage("submitting");

    // 1. Accept invite + set password
    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({})) as {
      data?: { email: string; campaignId: string };
      error?: string;
      details?: string[];
    };

    if (!res.ok) {
      const msgs = Array.isArray(data.details) && data.details.length > 0
        ? data.details
        : [data.error ?? "Failed to activate account. Please try again."];
      setErrors(msgs);
      setStage("form");
      return;
    }

    // 2. Sign in with credentials
    const result = await signIn("credentials", {
      email: data.data!.email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setGeneralError("Account activated! Sign in below with your new password.");
      setStage("done");
      return;
    }

    // 3. Success — go to dashboard, setup wizard will fire
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm border border-white/20">
            <span className="text-2xl">🗳️</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Poll City</h1>
          <p className="text-blue-200 mt-1 text-sm">Campaign Operations Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Loading */}
          {stage === "loading" && (
            <div className="text-center py-8">
              <span className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500 mt-4">Verifying your invite link…</p>
            </div>
          )}

          {/* Invalid */}
          {stage === "invalid" && (
            <ErrorState
              icon="❌"
              title="Invalid invite link"
              message="This invite link is not valid. It may have been mistyped or never existed."
              action={<Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">Go to sign in</Link>}
            />
          )}

          {/* Expired */}
          {stage === "expired" && (
            <ErrorState
              icon="⏰"
              title="Invite link expired"
              message="This invite link has expired (links are valid for 7 days). Contact Poll City to send you a new one."
              action={<Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">Go to sign in</Link>}
            />
          )}

          {/* Already used */}
          {stage === "used" && (
            <ErrorState
              icon="✅"
              title="Already activated"
              message="This invite link has already been used. Your account is ready — just sign in."
              action={<Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">Sign in</Link>}
            />
          )}

          {/* Revoked */}
          {stage === "revoked" && (
            <ErrorState
              icon="🚫"
              title="Invite revoked"
              message="This invite has been revoked. Contact your campaign manager to send a new one."
              action={<Link href="/login" className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">Go to sign in</Link>}
            />
          )}

          {/* Existing user — just sign in */}
          {stage === "existing" && invite && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4 text-2xl">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">You&apos;re already set up</h2>
              <p className="text-sm text-gray-500 mb-2">
                You&apos;ve been added to <strong className="text-gray-800">{invite.campaign.name}</strong>.
              </p>
              <p className="text-sm text-gray-500 mb-6">Sign in with your existing credentials to access your campaign.</p>
              <Link
                href={`/login?email=${encodeURIComponent(invite.email)}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}

          {/* Set password form */}
          {(stage === "form" || stage === "submitting") && invite && (
            <>
              {/* Campaign welcome banner */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">You&apos;re joining</p>
                <p className="text-base font-bold text-blue-900">{invite.campaign.name}</p>
                {invite.campaign.candidateName && (
                  <p className="text-sm text-blue-700 mt-0.5">{invite.campaign.candidateName}</p>
                )}
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-1">Activate your account</h2>
              <p className="text-sm text-gray-500 mb-6">
                Setting up for <span className="font-medium text-gray-700">{invite.email}</span>.
                Choose a password to get started.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors([]); }}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Min. 10 characters, uppercase + number + symbol"
                    disabled={stage === "submitting"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErrors([]); }}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Re-enter password"
                    disabled={stage === "submitting"}
                  />
                </div>

                {errors.length > 0 && (
                  <ul className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 space-y-1 list-disc list-inside">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}

                <button
                  type="submit"
                  disabled={stage === "submitting"}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {stage === "submitting" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Activating account…
                    </>
                  ) : (
                    "Activate Account & Sign In"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Fallback done state (sign-in failed after accept) */}
          {stage === "done" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <span className="text-xl">✅</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Account activated!</h2>
              <p className="text-sm text-gray-500 mb-6">{generalError || "Your account is ready. Sign in to access your campaign."}</p>
              <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors">
                Sign in
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ErrorState({
  icon, title, message, action,
}: {
  icon: string;
  title: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4 text-2xl">
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 mb-6">{message}</p>
      {action}
    </div>
  );
}
