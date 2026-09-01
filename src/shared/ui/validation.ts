/**
 * Client-side field validation for Campus Loop forms.
 *
 * This is the *first* layer only — instant, inline feedback before a request is made.
 * Every server action still re-parses with Zod; nothing here is trusted server-side.
 * The rules deliberately mirror the server schemas so the two layers never disagree.
 */
export type FieldValidator = (value: string) => string | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validators = {
  required:
    (label: string): FieldValidator =>
    (value) =>
      value.trim() ? null : `${label} is required.`,

  name: (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Please enter your full name.";
    if (trimmed.length < 2) return "That name looks too short.";
    if (trimmed.length > 80) return "That name is too long.";
    if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(trimmed)) {
      return "Name can only contain letters, spaces and . ' -";
    }
    return null;
  },

  email: (value: string): string | null => {
    if (!value.trim()) return "Email is required.";
    return EMAIL_PATTERN.test(value.trim()) ? null : "Enter a valid email address.";
  },

  password: (value: string): string | null => {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Passwords are at least 8 characters.";
    if (value.length > 128) return "That password is too long.";
    if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
      return "Include at least one letter and one number.";
    }
    return null;
  },

  listingTitle: (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Give your item a title.";
    if (trimmed.length < 3) return "That title is too short to be useful.";
    if (trimmed.length > 100) return "Keep the title under 100 characters.";
    return null;
  },

  listingDescription: (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Describe what you're listing.";
    if (trimmed.length < 10) return "Add a bit more detail — condition, what's included.";
    if (trimmed.length > 2000) return "That description is too long.";
    return null;
  },

  pickupArea: (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Name a pickup spot on campus.";
    if (trimmed.length < 2) return "That pickup area looks too short.";
    if (trimmed.length > 60) return "Keep the pickup area short.";
    return null;
  },

  messageBody: (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Write a message first.";
    if (trimmed.length > 2000) return "That message is too long.";
    return null;
  },
} as const;

/** Runs a validator map against form values; returns only the fields that failed. */
export function validateFields(
  values: Record<string, string>,
  rules: Record<string, FieldValidator>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, rule] of Object.entries(rules)) {
    const message = rule(values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}

export interface PasswordStrength {
  /** 0–4, matching the four bars the signup page draws. */
  readonly score: number;
  readonly label: string;
}

/**
 * Score a password for the four-bar meter on the signup form.
 *
 * The prototype drew that meter and never wired it — the bars were permanently empty.
 * This is deliberately a *coaching* signal, not a gate: `validators.password` decides
 * what is actually allowed, and it accepts a score of 2.
 */
export function scorePassword(value: string): PasswordStrength {
  if (!value) return { score: 0, label: "Password must be at least 8 characters" };

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  // A long-but-simple password ("aaaaaaaaaaaa") should not read as strong.
  const distinct = new Set(value).size;
  if (distinct < 5) score = Math.min(score, 1);

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;
  return { score, label: labels[score] ?? "Too weak" };
}
