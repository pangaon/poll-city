"use client";

import { useState, forwardRef } from "react";
import { Sparkles, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WriteAssistContext =
  | "email-body"
  | "email-subject"
  | "sms"
  | "note"
  | "social-post"
  | "general";

interface WriteAssistTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  context?: WriteAssistContext;
  campaignId?: string;
  wrapperClassName?: string;
}

export const WriteAssistTextarea = forwardRef<
  HTMLTextAreaElement,
  WriteAssistTextareaProps
>(
  (
    {
      value,
      onChange,
      context = "general",
      campaignId,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const [enhancing, setEnhancing] = useState(false);
    const [prevValue, setPrevValue] = useState<string | null>(null);

    async function enhance() {
      if (!value.trim() || enhancing) return;
      setEnhancing(true);
      try {
        const res = await fetch("/api/adoni/enhance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: value, context, campaignId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { enhanced?: string };
        if (data.enhanced) {
          setPrevValue(value);
          onChange(data.enhanced);
        }
      } catch {
        // silently fail — don't interrupt the user's compose flow
      } finally {
        setEnhancing(false);
      }
    }

    function undo() {
      if (prevValue !== null) {
        onChange(prevValue);
        setPrevValue(null);
      }
    }

    return (
      <div className={cn("w-full", wrapperClassName)}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={true}
          className={cn(
            "w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y disabled:bg-gray-50 disabled:text-gray-500",
            className,
          )}
          {...props}
        />
        <div className="flex items-center justify-end gap-3 mt-1 h-5">
          {prevValue !== null && (
            <button
              type="button"
              onClick={undo}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={enhance}
            disabled={enhancing || !value.trim()}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1D9E75] hover:text-[#1D9E75]/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {enhancing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {enhancing ? "Enhancing…" : "Enhance"}
          </button>
        </div>
      </div>
    );
  },
);
WriteAssistTextarea.displayName = "WriteAssistTextarea";
