/**
 * Returns the public base URL for QR codes / shareable links.
 * Avoids using preview/sandbox domains (lovableproject.com, id-preview--*.lovable.app)
 * which force the Lovable auth-bridge and block public anonymous access.
 */
export const PUBLIC_APP_URL = "https://equip-mind-sync.lovable.app";

export function getPublicBaseUrl(): string {
  if (typeof window === "undefined") return PUBLIC_APP_URL;
  const host = window.location.hostname;
  const isPreview =
    host.endsWith("lovableproject.com") ||
    host.startsWith("id-preview--") ||
    host.includes("sandbox");
  return isPreview ? PUBLIC_APP_URL : window.location.origin;
}
