"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts hook.
 *
 * Supported sequences:
 *   g then d → /dashboard
 *   g then c → /contacts
 *   g then v → /volunteers
 *   g then w → /canvassing/walk
 *   g then n → /notifications
 *   g then a → /analytics
 *   g then s → /signs
 *   g then p → /polls
 *   g then h → /help
 *   g then b → /budget
 *   /       → focus global search (handled by GlobalSearch)
 *   Cmd/Ctrl+K → open global search
 *   ?       → open keyboard shortcuts reference modal
 *   Esc     → close any open modal
 *
 * Listens to keydown on window. Ignores events when typing in input/textarea/select/contenteditable.
 */

const G_SEQUENCES: Record<string, string> = {
  d: "/dashboard",
  c: "/contacts",
  v: "/volunteers",
  w: "/canvassing/walk",
  n: "/notifications",
  a: "/analytics",
  s: "/signs",
  p: "/polls",
  h: "/help",
  b: "/budget",
};

export interface ShortcutHandlers {
  onOpenSearch?: () => void;
  onOpenShortcutsRef?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const router = useRouter();
  const lastKeyRef = useRef<{ key: string; time: number } | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl+K is global regardless of context
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlersRef.current.onOpenSearch?.();
        return;
      }

      // Ignore shortcuts while typing
      if (isTypingTarget(e.target)) return;

      // Ignore if modifiers held (except plain keys)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? opens shortcut reference
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        handlersRef.current.onOpenShortcutsRef?.();
        return;
      }

      // / focuses search
      if (e.key === "/") {
        e.preventDefault();
        handlersRef.current.onOpenSearch?.();
        return;
      }

      const now = Date.now();
      const last = lastKeyRef.current;

      // Reset if >1.5s since last keypress
      if (last && now - last.time > 1500) {
        lastKeyRef.current = null;
      }

      // "g" starts a sequence
      if (e.key.toLowerCase() === "g" && !lastKeyRef.current) {
        lastKeyRef.current = { key: "g", time: now };
        return;
      }

      // Second key of g-sequence
      if (lastKeyRef.current?.key === "g") {
        const target = G_SEQUENCES[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        lastKeyRef.current = null;
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

export const KEYBOARD_SHORTCUTS_REFERENCE: Array<{ keys: string; description: string; category: string }> = [
  { keys: "⌘K / Ctrl+K", description: "Open global search", category: "Global" },
  { keys: "/", description: "Open global search", category: "Global" },
  { keys: "?", description: "Show this shortcuts reference", category: "Global" },
  { keys: "Esc", description: "Close modal or panel", category: "Global" },
  { keys: "g d", description: "Go to Dashboard", category: "Navigation" },
  { keys: "g c", description: "Go to Contacts", category: "Navigation" },
  { keys: "g v", description: "Go to Volunteers", category: "Navigation" },
  { keys: "g w", description: "Go to Walk app (canvassing)", category: "Navigation" },
  { keys: "g n", description: "Go to Notifications", category: "Navigation" },
  { keys: "g a", description: "Go to Analytics", category: "Navigation" },
  { keys: "g s", description: "Go to Signs", category: "Navigation" },
  { keys: "g p", description: "Go to Polls", category: "Navigation" },
  { keys: "g h", description: "Go to Help Center", category: "Navigation" },
  { keys: "g b", description: "Go to Budget", category: "Navigation" },
];
