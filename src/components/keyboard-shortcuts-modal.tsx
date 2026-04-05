"use client";

import { X, Keyboard } from "lucide-react";
import { KEYBOARD_SHORTCUTS_REFERENCE } from "@/lib/hooks/useKeyboardShortcuts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  const categories = Array.from(new Set(KEYBOARD_SHORTCUTS_REFERENCE.map((s) => s.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
              <div className="space-y-1">
                {KEYBOARD_SHORTCUTS_REFERENCE.filter((s) => s.category === cat).map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{s.description}</span>
                    <kbd className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
