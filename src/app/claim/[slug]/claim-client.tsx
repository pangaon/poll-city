"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, TrendingUp,
  CheckCircle2, ArrowRight, Shield, Eye, EyeOff,
} from "lucide-react";

interface Props {
  official: {
    id: string;
    name: string;
    title: string;
    district: string;
    level: string;
    email: string | null;
    photoUrl: string | null;
    province: string | null;
    isClaimed: boolean;
    approvalScore: number | null;
    followerCount: number;
    questionCount: number;
  };
}

export default function ClaimClient({ official }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: official.name,
    email: official.email ?? "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<"form" | "submitting" | "done">("form");
  const [error, setError] = useState("");

  const year = new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }
    setStage("submitting");

    const res = await fetch("/api/auth/claim-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officialId: official.id,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }),
    });

    const data = await res.json() as {
      error?: string;
      details?: Record<string, string[]>;
      data?: { email: string; campaignId: string };
    };

    if (!res.ok) {
      const msg = data.details
        ? Object.values(data.details).flat().join(". ")
        : (data.error ?? "Something went wrong. Please try again.");
      setError(msg);
      setStage("form");
      return;
    }

    const result = await signIn("credentials", {
      email: data.data!.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created! Please sign in to continue.");
      router.push("/login");
      return;
    }

    setStage("done");
    router.push("/onboarding");
    router.refresh();
  }

  if (official.isClaimed) {
    return (
      <div className="min-h-screen bg-[#0A2342] flex items-center justify-center px-4">
        <div className="text-center text-white space-y-4 max-w-sm">
          <Shield className="h-12 w-12 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-bold">Profile already claimed</h1>
          <p className="text-blue-200">
            {official.name}&apos;s profile has been claimed. If this is your profile,{" "}
            <Link href="/login" className="text-amber-400 underline">sign in here</Link>.
          </p>
        </div>
      </div>
    );
  }

  const hasStats = official.followerCount > 0 || official.questionCount > 0 || official.approvalScore !== null;

  return (
    <div className="min-h-screen bg-[#0A2342] flex flex-col">
      {/* Nav */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          Poll City
        </Link>
        <Link href="/login" className="text-sm text-blue-300 hover:text-white transition-colors">
          Already have an account?
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">

          {/* Official identity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            {official.photoUrl ? (
              <Image
                src={official.photoUrl}
                alt={official.name}
                width={88}
                height={88}
                className="rounded-full mx-auto mb-4 border-4 border-white/20 object-cover"
              />
            ) : (
              <div className="w-22 h-22 w-[88px] h-[88px] rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20">
                {official.name.charAt(0)}
              </div>
            )}

            <h1 className="text-2xl font-bold text-white">{official.name}</h1>
            <p className="text-blue-300 text-sm mt-1">{official.title} · {official.district}</p>

            {hasStats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 mt-4 flex-wrap"
              >
                {official.followerCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      {official.followerCount.toLocaleString()} following you
                    </span>
                  </div>
                )}
                {official.questionCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-white">
                      {official.questionCount} question{official.questionCount !== 1 ? "s" : ""} waiting
                    </span>
                  </div>
                )}
                {official.approvalScore !== null && (
                  <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-white">
                      {official.approvalScore}% approval
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Your {official.district} campaign is ready to launch
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {official.questionCount > 0
                  ? `${official.questionCount} voter question${official.questionCount !== 1 ? "s" : ""} are waiting for your response. Set up your account to reply.`
                  : official.followerCount > 0
                    ? `${official.followerCount.toLocaleString()} voters in ${official.district} are following your activity on Poll City. Take control of your profile.`
                    : `Your public profile is already live on Poll City. Claim it to connect directly with your constituents.`
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {stage === "done" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="font-semibold text-gray-900">Launching your campaign...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Create a password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0A2342] focus:border-transparent"
                        placeholder="At least 8 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword
                          ? <EyeOff className="h-4 w-4" />
                          : <Eye className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={stage === "submitting"}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0A2342] text-white font-semibold py-3 text-sm hover:bg-[#0d2d57] transition-colors disabled:opacity-60"
                  >
                    {stage === "submitting" ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Launch my {year} campaign
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Free to start · No credit card required
                  </p>
                </>
              )}
            </form>
          </motion.div>

          {/* What happens next */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6 grid grid-cols-3 gap-3 text-center"
          >
            {[
              { icon: "🗺️", text: "Import your voter file" },
              { icon: "🚪", text: "Cut turf & assign canvassers" },
              { icon: "📊", text: "Track every door knocked" },
            ].map(({ icon, text }) => (
              <div key={text} className="bg-white/5 rounded-xl px-2 py-3">
                <p className="text-xl mb-1">{icon}</p>
                <p className="text-xs text-blue-200 leading-tight">{text}</p>
              </div>
            ))}
          </motion.div>

          <p className="text-center text-xs text-blue-400/60 mt-4">
            By signing up you agree to Poll City&apos;s{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
