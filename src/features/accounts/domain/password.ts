/**
 * The one definition of what counts as an acceptable password.
 *
 * Signup, the change-password form and anything added later all have to agree, and the
 * expensive way to discover they do not is a student whose new password is rejected by a
 * rule the signup form never applied. The messages are the same strings the client-side
 * `validators.password` shows, so the two layers never contradict each other.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Returns an error message to show, or null when the password is acceptable. */
export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Passwords are at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) return "That password is too long.";
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return "Include at least one letter and one number.";
  }
  return null;
}
