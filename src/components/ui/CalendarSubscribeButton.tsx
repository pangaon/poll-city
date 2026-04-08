"use client";

import { CalendarDays } from "lucide-react";

interface Props {
  postalCode: string;
  label?: string;
}

export default function CalendarSubscribeButton({
  postalCode,
  label = "Subscribe to Civic Calendar",
}: Props) {
  function handleClick() {
    window.open(`/api/calendar/${encodeURIComponent(postalCode)}`);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-navy/5 min-h-[40px]"
        style={{
          color: "#0A2342",
          borderColor: "#0A2342",
          background: "transparent",
        }}
        aria-label={label}
      >
        <CalendarDays className="w-4 h-4 flex-shrink-0" />
        {label}
      </button>
      <p className="text-xs text-gray-400 pl-1">
        Works with Apple Calendar, Google Calendar, Outlook
      </p>
    </div>
  );
}
