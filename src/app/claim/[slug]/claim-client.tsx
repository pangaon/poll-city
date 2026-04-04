"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, User, MapPin, Shield, ArrowRight } from "lucide-react";
import { Button, Card, CardContent, Input, FormField } from "@/components/ui";
import { toast } from "sonner";

interface Official {
  id: string;
  name: string;
  title: string;
  district: string;
  level: string;
  photoUrl: string | null;
  province: string | null;
}

interface Campaign {
  slug: string;
  name: string;
}

interface Props {
  campaign: Campaign;
  official: Official;
}

export default function ClaimClient({ campaign, official }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officialId: official.id, email: email.trim(), campaignSlug: campaign.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send verification");
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const levelLabel: Record<string, string> = {
    municipal: "Municipal",
    provincial: "Provincial",
    federal: "Federal",
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
              <p className="text-gray-600 text-sm">
                We sent a verification link to <strong>{email}</strong>. Follow the link to
                complete claiming your profile and get redirected to pricing.
              </p>
              <p className="text-xs text-gray-400">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button onClick={() => setSent(false)} className="text-blue-600 hover:underline">
                  try again
                </button>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Claim Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Verify your identity to take control of this public page</p>
        </div>

        {/* Official card */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              {official.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={official.photoUrl}
                  alt={official.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">{official.name}</h2>
                <p className="text-gray-500 text-sm">{official.title}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  {official.district}
                  {official.province && ` · ${official.province}`}
                  {" · "}
                  {levelLabel[official.level] ?? official.level}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim form */}
        <Card>
          <CardContent className="py-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 1 — Verify your email</h3>
              <p className="text-sm text-gray-500">
                Enter the official email address for your role as {official.title}. We&apos;ll send
                a verification link to confirm you are who you say you are.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Official email address" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@cityofexample.ca"
                  required
                />
              </FormField>

              <Button type="submit" loading={submitting} className="w-full">
                <ArrowRight className="w-4 h-4" />
                Send verification email
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Step 2 — Choose a plan</h3>
              <p className="text-xs text-gray-500">
                After verification you&apos;ll be redirected to our pricing page to activate your account
                and unlock full campaign management tools.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Not {official.name}?{" "}
          <Link href={`/candidates/${campaign.slug}`} className="text-blue-600 hover:underline">
            Back to public page
          </Link>
        </p>
      </div>
    </div>
  );
}
