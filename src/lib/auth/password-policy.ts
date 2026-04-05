// Poll City password policy — applied at register, reset, and change.

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "strong" | "very-strong";
}

const COMMON_SUBSTRINGS = [
  "password",
  "passw0rd",
  "123456",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "login",
  "pollcity",
];

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (typeof password !== "string") {
    return { valid: false, errors: ["Password is required"], strength: "weak" };
  }

  if (password.length < 10) errors.push("At least 10 characters required");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter required");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter required");
  if (!/[0-9]/.test(password)) errors.push("At least one number required");
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character required (!@#$%^&*)");
  }

  const lower = password.toLowerCase();
  if (COMMON_SUBSTRINGS.some((c) => lower.includes(c))) {
    errors.push("Password is too common — choose something unique");
  }

  const strength: PasswordValidation["strength"] =
    errors.length === 0
      ? password.length >= 16
        ? "very-strong"
        : "strong"
      : errors.length <= 2
        ? "fair"
        : "weak";

  return { valid: errors.length === 0, errors, strength };
}
