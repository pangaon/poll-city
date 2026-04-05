export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 10) errors.push("At least 10 characters required");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter required");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter required");
  if (!/[0-9]/.test(password)) errors.push("At least one number required");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character required");

  const common = ["password", "password1", "123456789", "qwerty"];
  if (common.some((entry) => password.toLowerCase().includes(entry))) {
    errors.push("Password is too common");
  }

  return { valid: errors.length === 0, errors };
}
