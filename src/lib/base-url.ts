/**
 * Resolves the public base URL used to build links in outgoing emails
 * (verification, password reset).
 *
 * Order of preference:
 *  1. NEXTAUTH_URL / AUTH_URL — an explicit, trusted, canonical URL. Set this
 *     in production to the real site (e.g. https://cuetips.dj).
 *  2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — the deployment's own domain,
 *     auto-provided by Vercel, so prod links work even if no explicit URL is set.
 *  3. http://localhost:3000 — local dev fallback.
 *
 * We deliberately do NOT derive this from the request Host header: that header
 * is attacker-controllable and these links go to users' inboxes, so a poisoned
 * Host could send a victim a link pointing at an attacker's domain.
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
