"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui";
import {
  MapPin, Calendar, Users, Heart, Share2, MessageSquare,
  CheckCircle, Phone, Mail, Globe, QrCode
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  slug: string;
  candidateName: string | null;
  candidateTitle: string | null;
  candidateBio: string | null;
  jurisdiction: string | null;
  electionType: string;
  logoUrl: string | null;
  primaryColor: string;
  supporterCount: number;
}

interface Poll {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    count: number;
    percentage: number;
  }[];
}

interface CandidatePageClientProps {
  campaign: Campaign;
  polls: Poll[];
}

export default function CandidatePageClient({ campaign, polls }: CandidatePageClientProps) {
  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [signForm, setSignForm] = useState({
    address: "",
    name: "",
    email: "",
  });
  const [supportForm, setSupportForm] = useState({
    name: "",
    email: "",
    householdCount: 1,
  });
  const [questionForm, setQuestionForm] = useState({
    name: "",
    email: "",
    question: "",
  });
  const [loading, setLoading] = useState(false);

  const handleVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/public/candidates/${campaign.slug}/volunteer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(volunteerForm),
      });
      if (response.ok) {
        toast.success("Thank you for volunteering!");
        setVolunteerForm({ name: "", email: "", phone: "", message: "" });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/public/candidates/${campaign.slug}/sign-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signForm),
      });
      if (response.ok) {
        toast.success("Sign request submitted!");
        setSignForm({ address: "", name: "", email: "" });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/public/candidates/${campaign.slug}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportForm),
      });
      if (response.ok) {
        toast.success("Thank you for your support!");
        setSupportForm({ name: "", email: "", householdCount: 1 });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/public/candidates/${campaign.slug}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionForm),
      });
      if (response.ok) {
        toast.success("Question submitted!");
        setQuestionForm({ name: "", email: "", question: "" });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4"
        style={{ backgroundColor: campaign.primaryColor }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {campaign.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.logoUrl}
                alt={campaign.candidateName || "Candidate"}
                width={120}
                height={120}
                className="rounded-full border-4 border-white object-cover"
              />
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {campaign.candidateName}
              </h1>
              <p className="text-xl opacity-90 mb-2">{campaign.candidateTitle}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {campaign.jurisdiction}
                </div>
                <Badge variant="default" className="bg-white/20 text-white border-white/30">
                  {campaign.electionType}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Bio */}
            {campaign.candidateBio && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">About {campaign.candidateName}</h2>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{campaign.candidateBio}</p>
                </CardContent>
              </Card>
            )}

            {/* Platform */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Platform & Pledges</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Sustainable Transportation</h3>
                      <p className="text-gray-600">Invest in bike lanes and public transit improvements.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Affordable Housing</h3>
                      <p className="text-gray-600">Create more affordable housing options for families.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Community Safety</h3>
                      <p className="text-gray-600">Improve lighting and community policing programs.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Polls */}
            {polls.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Live Polls</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {polls.map((poll) => (
                      <div key={poll.id}>
                        <h3 className="font-semibold mb-4">{poll.question}</h3>
                        <div className="space-y-2">
                          {poll.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{option.text}</span>
                                  <span>{option.percentage}% ({option.count})</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${option.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Events */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Upcoming Events</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold">Community Meet & Greet</h3>
                      <p className="text-gray-600">Join us for coffee and conversation</p>
                      <p className="text-sm text-gray-500">Saturday, May 15 • 10:00 AM</p>
                      <p className="text-sm text-gray-500">Community Center, Main St</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Supporter Counter */}
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{campaign.supporterCount}</div>
                <div className="text-gray-600">Supporters</div>
              </CardContent>
            </Card>

            {/* Volunteer Signup */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Join Our Team</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVolunteerSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={volunteerForm.name}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={volunteerForm.email}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={volunteerForm.phone}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <textarea
                    placeholder="Message (optional)"
                    value={volunteerForm.message}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "Volunteer"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sign Request */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Request a Sign</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your address"
                    value={signForm.address}
                    onChange={(e) => setSignForm({ ...signForm, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={signForm.name}
                    onChange={(e) => setSignForm({ ...signForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={signForm.email}
                    onChange={(e) => setSignForm({ ...signForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "Request Sign"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Support Signal */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Show Your Support</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Household size</label>
                    <select
                      value={supportForm.householdCount}
                      onChange={(e) => setSupportForm({ ...supportForm, householdCount: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "I Support"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Q&A */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Ask a Question</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuestionSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={questionForm.name}
                    onChange={(e) => setQuestionForm({ ...questionForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={questionForm.email}
                    onChange={(e) => setQuestionForm({ ...questionForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                  <textarea
                    placeholder="Your question"
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "Submit Question"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Share */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Share This Page</h3>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.share?.({ title: campaign.candidateName || "Candidate", url: shareUrl })}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                  >
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}