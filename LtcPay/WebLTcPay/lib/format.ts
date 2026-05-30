/** Format number with French locale separators */
export function fmt(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

/** Format as XAF currency */
export function fmtXAF(n: number | null | undefined): string {
  return fmt(n) + " F";
}

/** Compact number formatting (1k, 1.2M, etc.) */
export function fmtCompact(n: number): string {
  if (n < 1000) return fmt(n);
  if (n < 1_000_000) return fmt(n / 1000).replace(",", ".") + "k";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  return (n / 1_000_000_000).toFixed(2).replace(".00", "") + "Md";
}

/** Format date in French short format */
export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format time */
export function fmtTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
