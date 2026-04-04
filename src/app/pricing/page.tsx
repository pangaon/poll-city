import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free, scale as you grow. All plans include our core campaign management tools.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-center">Free Trial</CardTitle>
              <div className="text-center">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-gray-500">/14 days</span>
              </div>
              <CardDescription className="text-center">Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Up to 1,000 contacts</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Basic canvassing tools</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Mobile canvassing app</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Email support</li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/login">Start Free Trial</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 relative">
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600">Most Popular</Badge>
            <CardHeader>
              <CardTitle className="text-center">Starter</CardTitle>
              <div className="text-center">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-gray-500">/month</span>
              </div>
              <CardDescription className="text-center">For growing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Up to 10,000 contacts</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced analytics</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />AI campaign assistant</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Priority support</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Custom fields</li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/login">Start Starter Plan</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Pro</CardTitle>
              <div className="text-center">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <CardDescription className="text-center">For professional campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Unlimited contacts</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced reporting</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Multi-campaign support</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />API access</li>
                <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Dedicated support</li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/login">Contact Sales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or Additional Info */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            All plans include 14-day free trial. No credit card required to start.
          </p>
          <p className="text-sm text-gray-500">
            Questions? <a href="mailto:support@pollcity.com" className="text-blue-600 hover:underline">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
}