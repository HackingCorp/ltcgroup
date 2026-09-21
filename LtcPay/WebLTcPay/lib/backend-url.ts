/**
 * Absolute URL for a file served by the backend (operator logos, uploads).
 *
 * The API stores them as root-relative paths like "/static/operators/CM_MTN.webp".
 * Those resolve against the dashboard's own origin, which does not serve them,
 * so they have to be pointed at the API host.
 */
export function backendUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//pay.ltcgroup.site${path}`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}${path}`;
}
