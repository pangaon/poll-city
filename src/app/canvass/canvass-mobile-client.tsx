"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui";
import { MapPin, Phone, CheckCircle, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Assignment {
  id: string;
  canvassList: {
    id: string;
    name: string;
    contacts: {
      id: string;
      order: number;
      contact: {
        id: string;
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        supportLevel: string;
      };
    }[];
  };
}

interface CanvassMobileClientProps {
  campaignId: string;
  userId: string;
  assignments: Assignment[];
}

export default function CanvassMobileClient({
  campaignId,
  userId,
  assignments
}: CanvassMobileClientProps) {
  const [activeView, setActiveView] = useState<"home" | "walk" | "call" | "gotv">("home");

  if (activeView === "walk" && assignments.length > 0) {
    return <WalkView assignment={assignments[0]} onBack={() => setActiveView("home")} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">🗳️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Poll City</h1>
            <p className="text-sm text-gray-600">Mobile Canvasser</p>
          </div>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView("walk")}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Start Canvassing</h3>
                <p className="text-gray-600">Walk your assigned list and record interactions</p>
                {assignments.length > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    {assignments[0].canvassList.contacts.length} contacts
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView("call")}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Call List</h3>
                <p className="text-gray-600">Make phone calls to supporters and undecided voters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView("gotv")}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">GOTV Mode</h3>
                <p className="text-gray-600">Get out the vote — focus on confirmed supporters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Quick Capture</h3>
                <p className="text-gray-600">Record a quick interaction note</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Contacts Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Supporters</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WalkView({ assignment, onBack }: { assignment: Assignment; onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const contacts = assignment.canvassList.contacts;

  if (contacts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No contacts assigned</p>
          <Button onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  const contact = contacts[currentIndex].contact;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">{assignment.canvassList.name}</h2>
        <p className="text-sm opacity-90">
          Contact {currentIndex + 1} of {contacts.length}
        </p>
      </div>

      {/* Contact Info */}
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">{contact.firstName} {contact.lastName}</h3>
          <p className="text-gray-600">{contact.address1}</p>
          <p className="text-gray-600">{contact.city}</p>
          <Badge variant={contact.supportLevel === "supporter" ? "default" : "secondary"} className="mt-2">
            {contact.supportLevel}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button size="lg" className="w-full h-14 text-lg" variant="default">
            <CheckCircle className="w-5 h-5 mr-2" />
            Mark as Contacted
          </Button>
          <Button size="lg" className="w-full h-14 text-lg" variant="outline">
            <Phone className="w-5 h-5 mr-2" />
            Call Now
          </Button>
          <Button size="lg" className="w-full h-14 text-lg" variant="outline">
            <MapPin className="w-5 h-5 mr-2" />
            Get Directions
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentIndex(Math.min(contacts.length - 1, currentIndex + 1))}
            disabled={currentIndex === contacts.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}