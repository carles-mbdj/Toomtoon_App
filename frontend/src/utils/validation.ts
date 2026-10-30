const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export type PasswordStrength = 'faible' | 'moyen' | 'fort';

/** Mirrors the backend's minimum (models.py validate_password_strength):
 * anything shorter is rejected outright, this just scores the rest. */
export const MIN_PASSWORD_LENGTH = 8;

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 3) return 'fort';
  if (score === 2) return 'moyen';
  return 'faible';
}
