/** Short one-line version of a message, for titles and previews. */
export function clip(text: string, max = 200): string {
  const value = text.replace(/\s+/g, " ").trim()
  if (value.length <= max) return value
  return value.slice(0, Math.max(0, max - 1)) + "…"
}

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
]

/** "3 minutes ago", localized. */
export function timeAgo(timestamp: number, locale: string): string {
  const diff = timestamp - Date.now()
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return format.format(Math.round(diff / size), unit)
  }
  return format.format(Math.round(diff / 1000), "second")
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
