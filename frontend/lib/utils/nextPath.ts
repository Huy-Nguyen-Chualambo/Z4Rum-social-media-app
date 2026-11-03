const BASE = "http://z4rum.invalid";

/** Where to go after logging in. Only a path on this site, so a link cannot send people elsewhere. */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/")) return null;
  try {
    const url = new URL(next, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
