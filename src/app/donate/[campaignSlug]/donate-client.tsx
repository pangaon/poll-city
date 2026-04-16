"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import { motion, AnimatePresence } from "framer-motion";

interface CampaignData {
  id: string;
  name: string;
  slug: string;
  candidateName: string | null;
  candidateTitle: string | null;
  candidateBio: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  tagline: string | null;
  jurisdiction: string | null;
}

interface DonationPageData {
  id: string;
  title: string;
  description: string | null;
  suggestedAmounts: number[];
  minimumAmount: number;
  thankYouMessage: string | null;
  allowRecurring: boolean;
  requirePhone: boolean;
  requireEmployer: boolean;
}

interface Props {
  campaign: CampaignData;
  donationPage: DonationPageData | null;
}

type Step = "form" | "payment" | "success";

export default function DonateClient({ campaign, donationPage }: Props) {
  const primary = campaign.primaryColor ?? "#0A2342";
  const displayName = campaign.candidateName ?? campaign.name;
  const minAmount = donationPage?.minimumAmount ?? 5;
  const suggestedAmounts = donationPage?.suggestedAmounts ?? [25, 50, 100, 250];

  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState<number>(suggestedAmounts[1] ?? 50);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employer, setEmployer] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  // Stripe state
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : amount;

  // Load Stripe.js
  useEffect(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) return;
    loadStripe(pk).then((s) => setStripe(s));
  }, []);

  // Mount Stripe PaymentElement when clientSecret is available
  useEffect(() => {
    if (!stripe || !clientSecret || !paymentElementRef.current) return;

    const els = stripe.elements({
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: { colorPrimary: primary },
      },
    });
    const paymentElement = els.create("payment");
    paymentElement.mount(paymentElementRef.current);
    elementsRef.current = els;
    setElements(els);

    return () => {
      paymentElement.destroy();
      elementsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, clientSecret]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (effectiveAmount < minAmount) {
      setError(`Minimum donation is $${minAmount.toFixed(2)}.`);
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (donationPage?.requirePhone && !phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (donationPage?.requireEmployer && !employer.trim()) {
      setError("Employer is required for compliance purposes.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/donate/${campaign.slug}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(employer.trim() ? { employer: employer.trim() } : {}),
          anonymous,
          ...(donationPage ? { donationPageId: donationPage.id } : {}),
        }),
      });

      const data = await res.json() as { clientSecret?: string; error?: string };
      if (!res.ok || !data.clientSecret) {
        setError(data.error ?? "Unable to process donation. Please try again.");
        return;
      }

      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elementsRef.current) return;
    setError(null);
    setSubmitting(true);

    const baseUrl = window.location.origin;
    const { error: stripeError } = await stripe.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${baseUrl}/donate/${campaign.slug}?success=1`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    // Payment confirmed without redirect (e.g. card payment)
    setThankYouMessage(donationPage?.thankYouMessage ?? null);
    setStep("success");
    setSubmitting(false);
  }

  // Handle return from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setStep("success");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header style={{ backgroundColor: primary }} className="text-white py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {campaign.logoUrl && (
            <img
              src={campaign.logoUrl}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover bg-white"
            />
          )}
          <div>
            <div className="font-bold text-lg leading-tight">{displayName}</div>
            {campaign.candidateTitle && (
              <div className="text-xs opacity-80">{campaign.candidateTitle}</div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  {donationPage?.title ?? `Support ${displayName}`}
                </h1>
                {(donationPage?.description ?? campaign.tagline) && (
                  <p className="text-slate-600 text-sm mb-6">
                    {donationPage?.description ?? campaign.tagline}
                  </p>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-5">
                  {/* Amount selector */}
                  <fieldset>
                    <legend className="text-sm font-medium text-slate-700 mb-2">
                      Donation amount (CAD)
                    </legend>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {suggestedAmounts.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => { setAmount(a); setIsCustom(false); }}
                          className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                            !isCustom && amount === a
                              ? "text-white border-transparent"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                          }`}
                          style={!isCustom && amount === a ? { backgroundColor: primary } : {}}
                        >
                          ${a}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCustom(true)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          isCustom
                            ? "text-white border-transparent"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                        }`}
                        style={isCustom ? { backgroundColor: primary } : {}}
                      >
                        Other
                      </button>
                      {isCustom && (
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            min={minAmount}
                            step="1"
                            placeholder={minAmount.toString()}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                            style={{ "--tw-ring-color": primary } as React.CSSProperties}
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                    {effectiveAmount > 0 && effectiveAmount < minAmount && (
                      <p className="text-red-500 text-xs mt-1">
                        Minimum donation is ${minAmount}.
                      </p>
                    )}
                  </fieldset>

                  {/* Donor info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Last name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                    />
                  </div>

                  {donationPage?.requirePhone && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                  )}

                  {donationPage?.requireEmployer && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={employer}
                        onChange={(e) => setEmployer(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">Make this donation anonymous</span>
                  </label>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || effectiveAmount < minAmount}
                    className="w-full py-3 rounded-lg text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {submitting
                      ? "Preparing payment…"
                      : `Continue — $${effectiveAmount.toFixed(2)} CAD`}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <button
                  onClick={() => { setStep("form"); setClientSecret(null); setError(null); }}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
                >
                  ← Back
                </button>

                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  Payment details
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Donating{" "}
                  <strong className="text-slate-700">
                    ${effectiveAmount.toFixed(2)} CAD
                  </strong>{" "}
                  to {displayName}
                </p>

                <form onSubmit={handlePaymentSubmit} className="space-y-5">
                  {/* Stripe PaymentElement mounts here */}
                  <div ref={paymentElementRef} className="min-h-[120px]" />

                  {!elements && (
                    <div className="text-sm text-slate-400 text-center py-4">
                      Loading payment form…
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !elements}
                    className="w-full py-3 rounded-lg text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    style={{ backgroundColor: primary }}
                  >
                    {submitting ? "Processing…" : `Donate $${effectiveAmount.toFixed(2)} CAD`}
                  </button>

                  <p className="text-xs text-center text-slate-400">
                    Secured by Stripe. Your card information is never stored on our servers.
                  </p>
                </form>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-center py-12"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"
                  style={{ backgroundColor: `${primary}20`, color: primary }}
                >
                  ✓
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Thank you for your support!
                </h2>
                <p className="text-slate-600 max-w-sm mx-auto">
                  {thankYouMessage ??
                    `Your donation of $${effectiveAmount.toFixed(2)} CAD to ${displayName} has been received. A receipt will be emailed to ${email}.`}
                </p>
                {campaign.websiteUrl && (
                  <a
                    href={campaign.websiteUrl}
                    className="mt-8 inline-block px-6 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: primary }}
                  >
                    Visit our website
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compliance footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center space-y-1">
            <p>
              Contributions are regulated under applicable Canadian election finance laws.
            </p>
            <p>
              Donations must be made with personal funds. Corporate and union donations are prohibited.
            </p>
            {campaign.jurisdiction && <p>Jurisdiction: {campaign.jurisdiction}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
