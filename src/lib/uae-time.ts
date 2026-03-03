const TZ = "Asia/Dubai"; // UTC+4, no DST

/**
 * Returns the current moment as an ISO-8601 string with +04:00 offset.
 * Use this wherever an `updated_at` / `created_at` value is built client-side.
 */
export function nowUAE(): string {
  const now = new Date();
  // Build a YYYY-MM-DDTHH:mm:ss.sss+04:00 string
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    fractionalSecondDigits: 3,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  return (
    `${get("year")}-${get("month")}-${get("day")}` +
    `T${get("hour")}:${get("minute")}:${get("second")}.${get("fractionalSecond")}` +
    `+04:00`
  );
}

/**
 * Formats any date string for display in UAE timezone.
 * e.g. "15 Jan 2025"
 */
export function formatDateUAE(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AE", {
    timeZone: TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats any date-time string for display in UAE timezone.
 * e.g. "15 Jan 2025, 02:30 PM"
 */
export function formatDateTimeUAE(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-AE", {
    timeZone: TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
