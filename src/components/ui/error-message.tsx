"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { ErrorInfo } from "@/lib/errors";

interface ErrorMessageProps {
  /** Pass either `info` (preferred) OR title/description directly. */
  info?: ErrorInfo;
  title?: string;
  description?: string;
  action?: string;
  actionLink?: string;
  code?: string;
  onAction?: () => void;
  variant?: "inline" | "banner" | "card";
  className?: string;
}

/**
 * Standardized user-facing error component. Use this instead of raw text.
 *
 * @example
 *   <ErrorMessage info={ERRORS.IMPORT_FILE_TOO_LARGE} />
 *   <ErrorMessage title="Custom" description="..." action="Retry" onAction={() => retry()} />
 */
export function ErrorMessage({
  info,
  title,
  description,
  action,
  actionLink,
  code,
  onAction,
  variant = "card",
  className = "",
}: ErrorMessageProps) {
  const t = title ?? info?.title ?? "Something went wrong";
  const d = description ?? info?.description ?? "Please try again.";
  const a = action ?? info?.action;
  const link = actionLink ?? info?.actionLink;
  const c = code ?? info?.code;

  const base = "flex items-start gap-3 text-left";
  const variantClasses = {
    inline: "text-sm",
    banner: "bg-red-50 border border-red-200 rounded-xl p-3",
    card: "bg-white border border-red-200 rounded-xl p-4 shadow-sm",
  };

  const actionButton = a && (link ? (
    <Link
      href={link}
      className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:text-red-900 mt-2"
    >
      {a} <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  ) : onAction ? (
    <button
      onClick={onAction}
      className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:text-red-900 mt-2"
    >
      {a} <ArrowRight className="w-3.5 h-3.5" />
    </button>
  ) : null);

  return (
    <div className={`${base} ${variantClasses[variant]} ${className}`} role="alert">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-900 text-sm">{t}</p>
        <p className="text-sm text-red-700 mt-0.5">{d}</p>
        {actionButton}
        {c && <p className="text-xs text-gray-400 mt-1.5">Code: {c}</p>}
      </div>
    </div>
  );
}
