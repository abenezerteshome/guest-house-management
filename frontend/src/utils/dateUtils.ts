/**
 * Date utility helpers for the guest house management UI.
 *
 * IMPORTANT — Why this file exists:
 * -----------------------------------
 * `Date.toISOString()` always returns a UTC string (e.g. "2026-09-20T08:00:00.000Z").
 * When you slice that to 16 chars and feed it into an <input type="datetime-local">,
 * the browser treats it as LOCAL time — not UTC.
 *
 * For users in UTC+3 (EAT), this means a checkout stored as 11:00 local
 * becomes 08:00 UTC in toISOString(), which then gets displayed as 08:00 local —
 * 3 hours too early. Submitting that back gives a new_expected_checkout that is
 * *before* the existing one, causing the backend to reject the request with
 * "New checkout must be later than current expected checkout."
 *
 * Rule: ALWAYS use `toLocalDatetimeInput()` when populating a datetime-local input.
 *       NEVER use `.toISOString().slice(0, 16)` for that purpose.
 *
 * When SENDING a value to the API, parse the input string with `new Date()` and
 * call `.toISOString()` — that is correct because the Date constructor treats a
 * bare "YYYY-MM-DDTHH:mm" string as local time and toISOString() converts to UTC.
 */

/**
 * Converts a Date object to the "YYYY-MM-DDTHH:mm" format expected by
 * <input type="datetime-local"> using the user's LOCAL timezone.
 *
 * @example
 * // User is in UTC+3. Date is Sep 20 2026 11:00 EAT.
 * toLocalDatetimeInput(new Date('2026-09-20T08:00:00Z'))
 * // → "2026-09-20T11:00"  ✅ correct local time shown in input
 */
export function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}`
  )
}

/**
 * Returns today's date as a "YYYY-MM-DD" string in local time.
 * Safe to use as the `min` attribute on <input type="date">.
 */
export function todayLocalDateString(): string {
  return toLocalDateStr(new Date())
}

/**
 * Formats a Date object to "YYYY-MM-DD" in local time.
 */
export function toLocalDateStr(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
