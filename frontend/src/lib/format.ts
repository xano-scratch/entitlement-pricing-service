// Small display helpers. No currency symbols or figures in prose — fee rates are
// domain data shown as-is (a bps count or a flat number).

/** snake_case / kebab-case / a word -> Title Case. */
export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** A fee rate rendered by basis: "60 bps" or "20 flat". */
export function formatRate(basis: string, rate: number): string {
  return basis === "bps" ? `${rate} bps` : `${rate} flat`;
}

/** epoch-ms -> a readable local timestamp. */
export function formatDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** epoch-ms -> a date only. */
export function formatDay(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
