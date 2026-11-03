import type { FilmChoice } from "./types";

const ID = /^[\w-]{1,120}$/;

/** A guest's film lives in the link, so logging in can bring them back to it. */
export function watchPath(film: FilmChoice, position = 0) {
  const query = new URLSearchParams({
    source: film.source,
    slug: film.slug,
    server: String(film.server),
    episode: film.episode,
  });
  if (position >= 1) query.set("t", String(Math.floor(position)));
  return `/z4theater/watch?${query}`;
}

export function parseWatch(query: Record<string, string | string[] | undefined>) {
  const { source, slug, server, episode, t } = query;
  if (
    (source !== "phimapi" && source !== "nguonc") ||
    typeof slug !== "string" ||
    !ID.test(slug) ||
    typeof episode !== "string" ||
    !ID.test(episode) ||
    typeof server !== "string" ||
    !/^\d{1,2}$/.test(server)
  )
    return null;
  const film: FilmChoice = { source, slug, server: Number(server), episode };
  const position = typeof t === "string" && /^\d{1,5}$/.test(t) ? Number(t) : 0;
  return { film, position };
}
