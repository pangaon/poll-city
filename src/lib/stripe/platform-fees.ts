/**
 * Poll City — Platform Fee Constants
 *
 * Poll City acts as a Stripe Connect platform. When a donation flows through
 * the platform to a campaign's connected Stripe account, Poll City retains a
 * small application fee.
 *
 * How it works:
 *   - Donor pays $100
 *   - Poll City collects $1.50 (DONATION_FEE_RATE = 1.5%)
 *   - Campaign receives $100 − $1.50 − Stripe's processing fees (~2.9% + $0.30)
 *
 * This is standard practice for donation platforms.
 * ActBlue charges 3.95%; Poll City charges 1.5% — competitive and fair.
 *
 * Print shop marketplace fees are set separately at 15% in the print payment route.
 * Platform SaaS subscriptions go directly to George's Stripe account (no Connect needed).
 */

/** 1.5% of gross donation amount retained by Poll City */
export const DONATION_FEE_RATE = 0.015;

/**
 * Compute the application_fee_amount (in cents) for a given donation.
 * @param amountCents  Gross donation amount in cents (e.g. 10000 for $100.00 CAD)
 */
export function donationFeeAmount(amountCents: number): number {
  return Math.round(amountCents * DONATION_FEE_RATE);
}

/**
 * Minimum donation amount in CAD cents below which we do not collect a platform fee
 * (prevents fee from being larger than Stripe's minimum charge threshold).
 */
export const MIN_FEE_THRESHOLD_CENTS = 500; // $5.00 CAD
