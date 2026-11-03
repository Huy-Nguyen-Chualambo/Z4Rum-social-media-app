"use client";
import { useSyncExternalStore } from "react";
import type { MovieCard, MovieSource } from "./movies";

/** Saved films and what was last watched, kept on this device so guests have them too. */
export type WatchedFilm = MovieCard & {
  server: number;
  episode: string;
  episodeName: string;
  position: number;
  at: number;
};
type Library = { saved: MovieCard[]; history: WatchedFilm[] };

const KEY = "z4theater_library";
const MAX_SAVED = 100;
const MAX_HISTORY = 24;
const FINISHED_AT = 0.95;
const EMPTY: Library = { saved: [], history: [] };
const ID = /^[\w-]{1,120}$/;

export const isCard = (value: unknown): value is MovieCard => {
  const film = value as Partial<MovieCard> | null;
  return (
    !!film &&
    (film.source === ("phimapi" satisfies MovieSource) ||
      film.source === ("nguonc" satisfies MovieSource)) &&
    typeof film.slug === "string" &&
    ID.test(film.slug) &&
    typeof film.name === "string" &&
    typeof film.originalName === "string" &&
    typeof film.year === "string" &&
    typeof film.status === "string" &&
    typeof film.poster === "string" &&
    (film.poster === "" || film.poster.startsWith("https://")) &&
    film.adult === false &&
    (film.quality === undefined || typeof film.quality === "string") &&
    (film.language === undefined || typeof film.language === "string") &&
    (film.rating === undefined ||
      (typeof film.rating === "number" &&
        film.rating >= 0 &&
        film.rating <= 10))
  );
};
const isWatched = (value: unknown): value is WatchedFilm => {
  if (!isCard(value)) return false;
  const film = value as WatchedFilm;
  return (
    Number.isInteger(film.server) &&
    Number(film.server) >= 0 &&
    typeof film.episode === "string" &&
    ID.test(film.episode) &&
    typeof film.episodeName === "string" &&
    typeof film.position === "number" &&
    film.position >= 0 &&
    film.position <= 86_400 &&
    typeof film.at === "number"
  );
};

/** Whatever is stored may be old or edited by hand, so only sound entries survive. */
export function parseLibrary(raw: string | null): Library {
  try {
    const data = JSON.parse(raw ?? "{}");
    return {
      saved: Array.isArray(data.saved) ? data.saved.filter(isCard) : [],
      history: Array.isArray(data.history) ? data.history.filter(isWatched) : [],
    };
  } catch {
    return EMPTY;
  }
}

const sameFilm = (a: MovieCard, b: Pick<MovieCard, "source" | "slug">) =>
  a.source === b.source && a.slug === b.slug;
export const cardOf = (film: MovieCard): MovieCard => ({
  source: film.source,
  slug: film.slug,
  name: film.name,
  originalName: film.originalName,
  year: film.year,
  poster: film.poster,
  status: film.status,
  adult: false,
  ...(film.quality ? { quality: film.quality } : {}),
  ...(film.language ? { language: film.language } : {}),
  ...(film.rating ? { rating: film.rating } : {}),
});

export function withSaved(library: Library, film: MovieCard): Library {
  const known = library.saved.some((item) => sameFilm(item, film));
  return {
    ...library,
    saved: known
      ? library.saved.filter((item) => !sameFilm(item, film))
      : [cardOf(film), ...library.saved].slice(0, MAX_SAVED),
  };
}
export function withWatched(
  library: Library,
  film: MovieCard,
  place: { server: number; episode: string; episodeName: string },
  position: number,
  duration: number,
  at: number,
): Library {
  // A film watched to the end starts over rather than resuming on the credits.
  const finished = duration > 0 && position >= duration * FINISHED_AT;
  const entry = {
    ...cardOf(film),
    ...place,
    position: finished ? 0 : Math.floor(position),
    at,
  };
  return {
    ...library,
    history: [
      entry,
      ...library.history.filter((item) => !sameFilm(item, film)),
    ].slice(0, MAX_HISTORY),
  };
}

let current: Library | null = null;
const listeners = new Set<() => void>();
function read(): Library {
  if (current) return current;
  try {
    current = parseLibrary(localStorage.getItem(KEY));
  } catch {
    current = EMPTY;
  }
  return current;
}
function write(next: Library) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private windows may refuse: it still works until the page closes.
  }
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLibrary = () =>
  useSyncExternalStore(subscribe, read, () => EMPTY);
export const toggleSaved = (film: MovieCard) => write(withSaved(read(), film));
export const recordWatched = (
  film: MovieCard,
  place: { server: number; episode: string; episodeName: string },
  position: number,
  duration: number,
) =>
  write(withWatched(read(), film, place, position, duration, Date.now()));
export const forgetWatched = (film: MovieCard) => {
  const library = read();
  write({
    ...library,
    history: library.history.filter((item) => !sameFilm(item, film)),
  });
};
