"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui";
import { CheckCircle, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  plan: "free_trial" | "starter" | "pro";
  status: "active" | "canceled" | "past_due" | "incomplete";
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
}

interface BillingClientProps {
  subscription: Subscription | null;
  userEmail: string;
  userCreatedAt: Date;
}

export default function BillingClient({
  subscription,
  userEmail,
  userCreatedAt
}: BillingClientProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan: "starter" | "pro") => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isTrialActive = subscription?.plan === "free_trial" &&
    subscription.trialEnd && new Date() < subscription.trialEnd;

  const isSubscribed = subscription?.status === "active" &&
    subscription.plan !== "free_trial";

  const trialDaysLeft = subscription?.trialEnd
    ? Math.max(0, Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your Poll City subscription</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </h3>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold capitalize">{subscription.plan.replace("_", " ")}</h3>
                  <p className="text-sm text-gray-600">
                    {subscription.plan === "free_trial" && isTrialActive
                      ? `${trialDaysLeft} days left in trial`
                      : subscription.status === "active"
                      ? "Active subscription"
                      : `Status: ${subscription.status.replace("_", " ")}`
                    }
                  </p>
                </div>
                <Badge variant={
                  subscription.status === "active" ? "default" :
                  subscription.status === "past_due" ? "destructive" : "secondary"
                }>
                  {subscription.status.replace("_", " ")}
                </Badge>
              </div>

              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-600">
                  {subscription.status === "active"
                    ? `Renews on ${subscription.currentPeriodEnd.toLocaleDateString()}`
                    : `Expires on ${subscription.currentPeriodEnd.toLocaleDateString()}`
                  }
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Active Subscription</h3>
              <p className="text-gray-600">Choose a plan below to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {!isSubscribed && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <h3>Starter</h3>
                <p>$49/month</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Up to 10,000 contacts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced analytics</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />AI campaign assistant</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Priority support</li>
                </ul>
                <Button
                  onClick={() => handleSubscribe("starter")}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Processing..." : "Subscribe to Starter"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3>Pro</h3>
                <p>$99/month</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Unlimited contacts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced reporting</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Multi-campaign support</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />API access</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Dedicated support</li>
                </ul>
                <Button
                  onClick={() => handleSubscribe("pro")}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? "Processing..." : "Subscribe to Pro"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <h3>Account Information</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Email:</strong> {userEmail}</p>
            <p><strong>Member since:</strong> {userCreatedAt.toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}