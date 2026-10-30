import { isAxiosError } from 'axios';

/** Extract a user-facing message from an API error, falling back to a
 * default message when the error doesn't carry one (network error, etc). */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;

    // FastAPI/Pydantic validation errors (422) carry `detail` as a list of
    // {msg, loc, type} objects instead of a string - without this, every
    // validation failure (weak password, bad email...) silently fell back
    // to the generic `fallback` message instead of saying what was wrong.
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((d) => (typeof d === 'object' && d !== null && typeof d.msg === 'string' ? d.msg : null))
        .filter((m): m is string => !!m)
        .map((m) => m.replace(/^Value error,\s*/, ''));
      if (messages.length > 0) return messages.join(' ');
    }
  }
  return fallback;
}
