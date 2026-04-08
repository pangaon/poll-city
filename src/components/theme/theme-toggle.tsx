"use client";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("poll-city:theme") ?? "system") as Theme;
    setTheme(stored);
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    localStorage.setItem("poll-city:theme", t);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }

  const options: { value: Theme; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-slate-700">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => apply(value)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs transition-colors ${
            theme === value
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
