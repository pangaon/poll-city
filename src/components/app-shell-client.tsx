"use client";

import { useEffect, useState } from "react";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { GlobalSearch } from "@/components/global-search";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";

/**
 * Client-side shell that layers global search, keyboard shortcuts, and mobile nav
 * on top of the server-rendered sidebar + topbar + main content.
 */
export function AppShellClient({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function openSearch() {
      setSearchOpen(true);
    }

    window.addEventListener("pollcity:open-search", openSearch as EventListener);
    return () => window.removeEventListener("pollcity:open-search", openSearch as EventListener);
  }, []);

  useKeyboardShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onOpenShortcutsRef: () => setShortcutsOpen(true),
  });

  return (
    <>
      {children}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
