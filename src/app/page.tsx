import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, MapPin, BarChart3, Zap, Shield } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Ontario Election Banner */}
      <div className="bg-red-600 text-white text-center py-2 text-sm font-medium">
        🗳️ Ontario Municipal Elections 2026 — Declare in May, Win in October
      </div>

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🗳️</span>
            </div>
            <span className="font-bold text-xl">Poll City</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Button asChild variant="outline">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Win Your Ontario Campaign
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The complete campaign operations platform for municipal candidates. Manage voters, coordinate volunteers, track signs, and engage your community — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-3">
              <Link href="/login">Start Free 14-Day Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3">
              <Link href="#features">See How It Works</Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Win</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From voter outreach to election day, Poll City gives you the tools to run a professional campaign.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Voter CRM</CardTitle>
                <CardDescription>
                  Track every interaction, support level, and contact detail for your entire voter base.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <MapPin className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Canvassing & GOTV</CardTitle>
                <CardDescription>
                  Door-to-door tracking, walk lists, and get-out-the-vote coordination for maximum turnout.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  Real-time insights into support rates, volunteer activity, and campaign progress.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>AI Campaign Assistant</CardTitle>
                <CardDescription>
                  Get strategic advice, script suggestions, and automated task prioritization.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Sign & Volunteer Tracking</CardTitle>
                <CardDescription>
                  Manage sign placements, volunteer schedules, and campaign logistics.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CheckCircle className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Mobile Optimized</CardTitle>
                <CardDescription>
                  Full mobile canvassing interface for volunteers working from their phones.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600">Get up and running in minutes, not months.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Import Your Voters</h3>
              <p className="text-gray-600">
                Upload your voter lists via CSV or connect to Ontario election data. We handle the rest.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Organize Your Team</h3>
              <p className="text-gray-600">
                Invite volunteers, assign canvassing routes, and track progress in real-time.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              <h3 className="text-xl font-semibold mb-2">Win on Election Day</h3>
              <p className="text-gray-600">
                Use GOTV tools to ensure every supporter votes. Celebrate your victory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600">Start free, scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                <ul className="space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Up to 1,000 contacts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Basic canvassing tools</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Mobile canvassing app</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Email support</li>
                </ul>
                <Button className="w-full mt-6" asChild>
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
                <ul className="space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Up to 10,000 contacts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced analytics</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />AI campaign assistant</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Priority support</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Custom fields</li>
                </ul>
                <Button className="w-full mt-6" asChild>
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
                <ul className="space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Unlimited contacts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Advanced reporting</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Multi-campaign support</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />API access</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />Dedicated support</li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="/login">Contact Sales</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Win Your Election?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of Ontario candidates already using Poll City to run winning campaigns.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-3">
            <Link href="/login">Start Your Free Trial Today</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🗳️</span>
                </div>
                <span className="font-bold text-xl">Poll City</span>
              </div>
              <p className="text-gray-400">
                The campaign operations platform for Ontario municipal candidates.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:support@pollcity.com" className="hover:text-white">Contact</a></li>
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:hello@pollcity.com" className="hover:text-white">About</a></li>
                <li><a href="mailto:careers@pollcity.com" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Poll City. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
