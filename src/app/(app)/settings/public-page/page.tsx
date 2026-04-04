"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import {
  Eye, QrCode, Globe, Upload, Save, ExternalLink,
  CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

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
  customDomain: string | null;
  isPublic: boolean;
}

export default function PublicPageSettings() {
  const { data: session } = useSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateTitle: "",
    candidateBio: "",
    primaryColor: "#3B82F6",
    isPublic: false,
    customDomain: "",
    logoUrl: "",
  });

  useEffect(() => {
    fetchCampaign();
  }, []);

  const fetchCampaign = async () => {
    try {
      const response = await fetch("/api/campaigns/current");
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
        setFormData({
          candidateName: data.candidateName || "",
          candidateTitle: data.candidateTitle || "",
          candidateBio: data.candidateBio || "",
          primaryColor: data.primaryColor || "#3B82F6",
          isPublic: data.isPublic || false,
          customDomain: data.customDomain || "",
          logoUrl: data.logoUrl || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/campaigns/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
        fetchCampaign();
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formDataUpload,
      });

      if (response.ok) {
        const { url } = await response.json();
        setFormData({ ...formData, logoUrl: url });
        toast.success("Photo uploaded successfully");
      } else {
        toast.error("Failed to upload photo");
      }
    } catch (error) {
      toast.error("Failed to upload photo");
    }
  };

  const generateQRCode = () => {
    if (!campaign) return;
    const url = `${window.location.origin}/candidates/${campaign.slug}`;
    // In a real app, you'd generate a QR code here
    // For now, just copy the URL
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!campaign) {
    return <div className="p-6">Campaign not found</div>;
  }

  const publicUrl = `${window.location.origin}/candidates/${campaign.slug}`;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Public Campaign Page</h1>
        <p className="text-gray-600">
          Create a professional online presence for your campaign. Share your story, platform, and connect with voters.
        </p>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="domain">Custom Domain</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Public Page</h3>
                  <p className="text-sm text-gray-600">Make your campaign page visible to the public</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              {formData.isPublic && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Your page is live!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Share this link: <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="underline">{publicUrl}</a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Candidate Name</label>
                <Input
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  placeholder="Enter candidate name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title/Position</label>
                <Input
                  value={formData.candidateTitle}
                  onChange={(e) => setFormData({ ...formData, candidateTitle: e.target.value })}
                  placeholder="e.g. City Councillor, Ward 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea
                  value={formData.candidateBio}
                  onChange={(e) => setFormData({ ...formData, candidateBio: e.target.value })}
                  placeholder="Tell voters about yourself, your background, and why you're running..."
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-8 border rounded"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Photo</label>
                <div className="flex items-center gap-4">
                  {campaign.logoUrl && (
                    <Image
                      src={campaign.logoUrl}
                      alt="Candidate photo"
                      width={80}
                      height={80}
                      className="rounded-full border"
                    />
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload">
                      <Button variant="outline" type="button">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Domain Name</label>
                <Input
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="yourdomain.com"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Enter your custom domain (without https://). You'll need to point it to our servers.
                </p>
              </div>

              {formData.customDomain && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">DNS Configuration</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Point your domain to: <code className="bg-blue-100 px-1 rounded">pollcity.app</code>
                  </p>
                  <div className="text-sm text-blue-700">
                    <p><strong>CNAME Record:</strong> {formData.customDomain} → pollcity.app</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Domain"}
                </Button>
                {formData.customDomain && (
                  <Button variant="outline" onClick={() => window.open(`https://${formData.customDomain}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Test Domain
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => window.open(publicUrl, '_blank')}
                    disabled={!formData.isPublic}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Live Page
                  </Button>

                  <Button variant="outline" onClick={generateQRCode}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>
                </div>

                {!formData.isPublic && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Page is not public</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Enable the public page toggle to make it visible to voters.
                    </p>
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-2">Page URL</h3>
                  <code className="text-sm bg-white p-2 rounded border block">
                    {publicUrl}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}