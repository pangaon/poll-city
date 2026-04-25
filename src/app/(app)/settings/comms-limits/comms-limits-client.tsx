"use client";
import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { PageHeader, Card, CardHeader, CardContent, CardTitle, FormField, Input, Button } from "@/components/ui";
import { toast } from "sonner";

interface Props {
  commsCooldownHours: number;
  commsMaxPerWeek: number | null;
  commsMaxPerMonth: number | null;
}

export default function CommsLimitsClient({ commsCooldownHours, commsMaxPerWeek, commsMaxPerMonth }: Props) {
  const [cooldown, setCooldown] = useState(String(commsCooldownHours));
  const [maxWeek, setMaxWeek] = useState(commsMaxPerWeek != null ? String(commsMaxPerWeek) : "");
  const [maxMonth, setMaxMonth] = useState(commsMaxPerMonth != null ? String(commsMaxPerMonth) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const cooldownVal = parseInt(cooldown, 10);
    const weekVal = maxWeek.trim() === "" ? null : parseInt(maxWeek, 10);
    const monthVal = maxMonth.trim() === "" ? null : parseInt(maxMonth, 10);

    if (isNaN(cooldownVal) || cooldownVal < 0 || cooldownVal > 720) {
      toast.error("Cooldown must be between 0 and 720 hours.");
      return;
    }
    if (weekVal !== null && (isNaN(weekVal) || weekVal < 1 || weekVal > 100)) {
      toast.error("Weekly limit must be between 1 and 100.");
      return;
    }
    if (monthVal !== null && (isNaN(monthVal) || monthVal < 1 || monthVal > 200)) {
      toast.error("Monthly limit must be between 1 and 200.");
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/campaigns/current/comms-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commsCooldownHours: cooldownVal, commsMaxPerWeek: weekVal, commsMaxPerMonth: monthVal }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      toast.success("Communications limits saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Communications Limits"
        description="Control how often your campaign can message the same contact. These rules protect your relationships and keep your sender reputation strong."
      />

      <Card>
        <CardHeader><CardTitle>Cooldown Window</CardTitle></CardHeader>
        <CardContent>
          <FormField
            label="Hours between messages"
            hint="A contact who received an email at 9am won't get an SMS until this many hours later."
            help={{
              content: "The minimum time between any two messages — across all channels — sent to the same contact. Setting this to 0 disables the cooldown entirely.",
              example: "24 hours (one message per day, any channel)",
              tip: "Ontario election law does not specify a frequency limit, but over-messaging increases opt-outs and CASL complaints.",
            }}
          >
            <Input
              type="number"
              min={0}
              max={720}
              value={cooldown}
              onChange={(e) => { setCooldown(e.target.value); setSaved(false); }}
              placeholder="24"
              className="w-32"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Frequency Caps</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            These limits count messages across all channels (email + SMS). Leave blank for no cap.
            Contacts who have hit a cap are silently excluded from blasts — they are not counted as failures.
          </p>
          <FormField
            label="Max messages per week"
            hint="Per contact, rolling 7-day window. Leave blank for no weekly cap."
            help={{
              content: "The maximum number of email or SMS messages a single contact can receive in any 7-day window. Contacts who hit this cap are excluded from blast sends.",
              example: "3 messages per week",
              tip: "CASL does not impose a per-week limit, but best practice for municipal campaigns is 2–4 messages per week during the final month.",
            }}
          >
            <Input
              type="number"
              min={1}
              max={100}
              value={maxWeek}
              onChange={(e) => { setMaxWeek(e.target.value); setSaved(false); }}
              placeholder="No cap"
              className="w-32"
            />
          </FormField>

          <FormField
            label="Max messages per month"
            hint="Per contact, rolling 30-day window. Leave blank for no monthly cap."
            help={{
              content: "The maximum number of email or SMS messages a single contact can receive in any 30-day window.",
              example: "10 messages per month",
              tip: "Sending more than 12–15 messages per month is strongly correlated with elevated CASL unsubscribe rates.",
            }}
          >
            <Input
              type="number"
              min={1}
              max={200}
              value={maxMonth}
              onChange={(e) => { setMaxMonth(e.target.value); setSaved(false); }}
              placeholder="No cap"
              className="w-32"
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save limits
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
