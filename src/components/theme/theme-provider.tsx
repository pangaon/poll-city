"use client";
import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("poll-city:theme") ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (stored === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  return <>{children}</>;
}
