"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  CheckCircle,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Download,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  plan: "free_trial" | "starter" | "pro";
  status: "active" | "canceled" | "past_due" | "incomplete";
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  created: number;
}

interface BillingClientProps {
  subscription: Subscription | null;
  userEmail: string;
  userCreatedAt: Date;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$49",
    period: "/ month",
    description: "Everything a first-time candidate needs to run.",
    features: [
      "Up to 10,000 contacts",
      "Full canvassing & field ops",
      "AI campaign assistant (Adoni)",
      "Email & SMS outreach",
      "Fundraising suite",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$99",
    period: "/ month",
    description: "For serious campaigns running at full scale.",
    features: [
      "Unlimited contacts",
      "All Starter features",
      "Advanced analytics & reports",
      "Multi-campaign support",
      "API access",
      "Dedicated account manager",
    ],
    highlight: false,
  },
];

// ─── URL param success/cancel toast handler ────────────────────────────────────

function CheckoutResultHandler() {
  const params = useSearchParams();
  useEffect(() => {
    if (!params) return;
    if (params.get("success") === "true") {
      toast.success("You're subscribed! Welcome to Poll City.", {
        description: "Your subscription is now active.",
        duration: 6000,
      });
    }
    if (params.get("canceled") === "true") {
      toast.info("Checkout cancelled — no charge was made.");
    }
  }, [params]);
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function planLabel(plan: string) {
  return plan === "free_trial" ? "Free Trial" : plan.charAt(0).toUpperCase() + plan.slice(1);
}

function statusColor(status: string): "default" | "warning" | "danger" | "info" {
  if (status === "active") return "default";
  if (status === "past_due") return "danger";
  if (status === "canceled") return "info";
  return "warning";
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ─── Main component ───────────────────────────────────────────────────────────

export default function BillingClient({ subscription, userEmail, userCreatedAt }: BillingClientProps) {
  const [checkoutLoading, setCheckoutLoading] = useState<"starter" | "pro" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  // Fetch invoice history once on mount if a customer exists
  useEffect(() => {
    if (!subscription?.status || subscription.status === "incomplete") return;

    async function fetchInvoices() {
      setInvoicesLoading(true);
      try {
        const res = await fetch("/api/stripe/invoices");
        if (!res.ok) throw new Error("Failed to load invoices");
        const data = await res.json();
        setInvoices(data.invoices ?? []);
      } catch {
        setInvoicesError("Could not load invoice history.");
      } finally {
        setInvoicesLoading(false);
      }
    }

    fetchInvoices();
  }, [subscription?.status]);

  const handleSubscribe = async (plan: "starter" | "pro") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not open billing portal");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const isActivePaid =
    subscription?.status === "active" && subscription.plan !== "free_trial";
  const isTrialActive =
    subscription?.plan === "free_trial" &&
    subscription.trialEnd &&
    new Date() < new Date(subscription.trialEnd);
  const isPastDue = subscription?.status === "past_due";
  const isCanceled = subscription?.status === "canceled";
  const showPlanSelector = !isActivePaid || isPastDue || isCanceled;
  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / 86_400_000))
    : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Suspend the URL-param handler to avoid build error */}
      <Suspense fallback={null}>
        <CheckoutResultHandler />
      </Suspense>

      <div>
        <h1 className="text-2xl font-bold text-[#0A2342]">Billing &amp; Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your Poll City subscription and invoices.</p>
      </div>

      {/* ── Past Due Banner ────────────────────────────────── */}
      <AnimatePresence>
        {isPastDue && (
          <motion.div
            key="past-due"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E24B4A]" />
            <div className="flex-1">
              <p className="font-semibold text-[#E24B4A]">Payment failed</p>
              <p className="text-sm text-red-700">
                Your last payment did not go through. Update your payment method to keep your
                subscription active.
              </p>
            </div>
            <Button size="sm" variant="destructive" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Payment"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Current Plan Card ─────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <Card>
          <CardHeader>
            <h3 className="flex items-center gap-2 font-semibold text-[#0A2342]">
              <CreditCard className="h-5 w-5 text-[#1D9E75]" />
              Current Plan
            </h3>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-[#0A2342]">
                      {planLabel(subscription.plan)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isTrialActive
                        ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in trial`
                        : subscription.status === "active"
                        ? subscription.currentPeriodEnd
                          ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}`
                          : "Active subscription"
                        : `Status: ${subscription.status.replace(/_/g, " ")}`}
                    </p>
                  </div>
                  <Badge variant={statusColor(subscription.status)}>
                    {subscription.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Cancel-at-period-end warning */}
                <AnimatePresence>
                  {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                    <motion.div
                      key="cancel-warn"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF9F27]" />
                      <p className="text-sm text-amber-800">
                        Your subscription is set to cancel on{" "}
                        <strong>
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </strong>
                        . Reactivate it in the billing portal to continue.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Manage subscription — only if customer exists in Stripe */}
                {(isActivePaid || isPastDue) && (
                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePortal}
                      disabled={portalLoading}
                      className="flex items-center gap-2"
                    >
                      {portalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Manage Subscription
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ShieldCheck className="h-12 w-12 text-gray-300" />
                <div>
                  <p className="font-semibold text-gray-700">No active subscription</p>
                  <p className="text-sm text-gray-500">Choose a plan below to get started.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Plan Selector ─────────────────────────────────── */}
      <AnimatePresence>
        {showPlanSelector && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-[#0A2342]">
              {isTrialActive ? "Upgrade your trial" : "Choose a plan"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -2 }}
                  transition={spring}
                  className={`rounded-xl border-2 p-5 ${
                    plan.highlight
                      ? "border-[#1D9E75] bg-[#1D9E75]/5"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-[#0A2342]">{plan.name}</p>
                      <p className="text-xs text-gray-500">{plan.description}</p>
                    </div>
                    {plan.highlight && (
                      <span className="rounded-full bg-[#1D9E75] px-2 py-0.5 text-xs font-medium text-white">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#0A2342]">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>

                  <ul className="mb-5 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 shrink-0 text-[#1D9E75]" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={checkoutLoading !== null}
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                  >
                    {checkoutLoading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting…
                      </>
                    ) : isTrialActive ? (
                      `Upgrade to ${plan.name}`
                    ) : (
                      `Subscribe — ${plan.name}`
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invoice History ───────────────────────────────── */}
      <AnimatePresence>
        {(invoicesLoading || invoices.length > 0 || invoicesError) && (
          <motion.div
            key="invoices"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <h3 className="flex items-center gap-2 font-semibold text-[#0A2342]">
                  <ReceiptText className="h-5 w-5 text-[#1D9E75]" />
                  Invoice History
                </h3>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Loading invoices…
                  </div>
                ) : invoicesError ? (
                  <p className="py-4 text-center text-sm text-gray-500">{invoicesError}</p>
                ) : invoices.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">No invoices yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Invoice</th>
                          <th className="pb-2 pr-4">Amount</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 text-gray-700">
                              {new Date(inv.created * 1000).toLocaleDateString("en-CA", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 pr-4 font-mono text-gray-600">
                              {inv.number ?? inv.id.slice(0, 12)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-[#0A2342]">
                              {formatCurrency(inv.amountPaid || inv.amountDue, inv.currency)}
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                variant={
                                  inv.status === "paid"
                                    ? "default"
                                    : inv.status === "open"
                                    ? "warning"
                                    : "info"
                                }
                              >
                                {inv.status ?? "unknown"}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {inv.hostedInvoiceUrl && (
                                  <a
                                    href={inv.hostedInvoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1D9E75] hover:underline flex items-center gap-1"
                                    aria-label="View invoice"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View
                                  </a>
                                )}
                                {inv.invoicePdf && (
                                  <a
                                    href={inv.invoicePdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-[#0A2342] flex items-center gap-1"
                                    aria-label="Download PDF"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    PDF
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Account Info ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-[#0A2342]">Account</h3>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Email</dt>
                <dd className="mt-0.5 text-gray-700">{userEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Member since</dt>
                <dd className="mt-0.5 text-gray-700">
                  {new Date(userCreatedAt).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
