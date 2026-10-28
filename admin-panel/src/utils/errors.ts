import { isAxiosError } from 'axios';

/** Extract a user-facing message from an API error, falling back to a
 * default message when the error doesn't carry one (network error, etc). */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}
