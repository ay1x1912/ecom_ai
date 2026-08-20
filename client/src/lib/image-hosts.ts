/**
 * Hosts whose images we are willing to run through Next's optimiser.
 *
 * Imported by BOTH next.config.ts and <ProductImage>, so the allow-list and the
 * runtime check can never drift apart. Keep it narrow on purpose: the optimiser
 * fetches remote URLs from our own server, and allowing `**` would turn the app
 * into an open image proxy for whatever an admin pastes into the product form.
 */
export const OPTIMISED_IMAGE_HOSTS = [
  // Cloudflare R2 public buckets — where our own uploads land.
  "**.r2.dev",
] as const;

/**
 * placehold.co is deliberately NOT on that list.
 *
 * It answers with image/svg+xml, which next/image refuses to process unless
 * `dangerouslyAllowSVG` is turned on — and turning that on makes our own origin
 * re-serve third-party SVG, which is a script-execution surface. The fallback
 * below renders it as a plain <img> instead, where SVG is inert. Seed data
 * displays, no dangerous flag.
 */

const matches = (hostname: string, pattern: string) =>
  pattern.startsWith("**.")
    ? hostname === pattern.slice(3) || hostname.endsWith(pattern.slice(2))
    : hostname === pattern;

/**
 * Anything else still renders — as a plain <img>, fetched by the browser.
 *
 * That matters because `products.image` is a free-text URL an admin typed. An
 * unrecognised host must degrade to an unoptimised image, never throw and take
 * the whole listing down with it.
 */
export function canOptimise(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== "https:") return false;
    return OPTIMISED_IMAGE_HOSTS.some((pattern) => matches(hostname, pattern));
  } catch {
    return false;
  }
}
