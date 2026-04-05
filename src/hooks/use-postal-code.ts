"use client";
import { useState, useCallback } from "react";

// Canadian postal code input hook.
// - Strips non-alphanumeric
// - Uppercases
// - Caps at 6 chars
// - Auto-inserts space after the 3rd character ("A1A 1A1")
//
// Usage:
//   const { value, onChange, isComplete, isValid, clear } = usePostalCode();
//   <input value={value} onChange={(e) => onChange(e.target.value)} />

export interface UsePostalCode {
  value: string;
  onChange: (input: string) => void;
  isComplete: boolean;
  isValid: boolean;
  clear: () => void;
  raw: string; // unformatted 6-char string, e.g. "M2H2W7"
}

const FULL_REGEX = /^[A-Z]\d[A-Z] \d[A-Z]\d$/;

export function usePostalCode(initial = ""): UsePostalCode {
  const [value, setValue] = useState(() => format(initial));

  const onChange = useCallback((input: string) => {
    setValue(format(input));
  }, []);

  const clear = useCallback(() => setValue(""), []);

  const raw = value.replace(/\s/g, "");
  const isComplete = FULL_REGEX.test(value);
  const isValid = isComplete;

  return { value, onChange, isComplete, isValid, clear, raw };
}

function format(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}
