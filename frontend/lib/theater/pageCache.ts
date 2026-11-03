import { cardOf, isCard } from "./library";
import type { MoviePage } from "./movies";

/** Catalog pages kept on this device, so a returning viewer sees films at once. */
const KEY = "z4theater_pages";
const FRESH_MS = 5 * 60_000;
const KEEP_MS = 3 * 24 * 60 * 60_000;
const MAX_PAGES = 30;

type Stored = Record<string, { at: number; page: MoviePage }>;

function readAll(): Stored {
  const found: Stored = {};
  try {
    const data = JSON.parse(globalThis.localStorage.getItem(KEY) ?? "{}");
    for (const [url, entry] of Object.entries(data ?? {})) {
      const { at, page } = (entry ?? {}) as Partial<Stored[string]>;
      if (typeof at !== "number" || !Array.isArray(page?.movies)) continue;
      found[url] = {
        at,
        page: {
          movies: page.movies.filter(isCard),
          page: Number(page.page) || 1,
          totalPages: Number(page.totalPages) || 1,
        },
      };
    }
  } catch {
    // Unavailable or damaged storage only means the network answers instead.
  }
  return found;
}

function save(url: string, page: MoviePage, now: number) {
  const pages = readAll();
  pages[url] = { at: now, page: { ...page, movies: page.movies.map(cardOf) } };
  const kept = Object.entries(pages)
    .filter(([, entry]) => now - entry.at < KEEP_MS)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_PAGES);
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // A full or private storage just skips the cache.
  }
}

const listeners = new Set<() => void>();
/** Runs when a page already on screen turned out to have changed. */
export function onPageRefresh(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const sameFilms = (a: MoviePage, b: MoviePage) =>
  JSON.stringify(a.movies.map(cardOf)) === JSON.stringify(b.movies.map(cardOf));

/** Answers from the device when it can, then checks an old answer in the background. */
export async function cachedPage(url: string, load: () => Promise<MoviePage>) {
  const now = Date.now();
  const hit = readAll()[url];
  const usable = hit && hit.page.movies.length && now - hit.at < KEEP_MS;
  if (usable && now - hit.at < FRESH_MS) return hit.page;
  const refresh = load().then((page) => {
    if (page.movies.length) save(url, page, Date.now());
    return page;
  });
  if (!usable) return refresh;
  refresh
    .then((page) => {
      if (!sameFilms(page, hit.page)) listeners.forEach((listener) => listener());
    })
    // The old list stays up; opening a film has its own fallback.
    .catch(() => {});
  return hit.page;
}
