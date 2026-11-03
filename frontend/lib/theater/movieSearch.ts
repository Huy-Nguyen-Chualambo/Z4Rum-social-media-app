import type { MovieCard } from "./movies";

/** Folds accents, including đ which has no combining form, so titles compare as typed. */
export const normalizeTitle = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const tokensOf = (keyword: string) =>
  normalizeTitle(keyword)
    .split(" ")
    .filter((token) => token.length >= 2);

export function scoreMovie(movie: MovieCard, keyword: string) {
  const wanted = normalizeTitle(keyword);
  const titles = [
    movie.name,
    ...movie.originalName.split(","),
    ...(movie.altNames ?? []),
  ].map(normalizeTitle);
  const tokens = tokensOf(keyword);
  const all = titles.join(" ");
  const matched = tokens.filter((token) => all.includes(token)).length;
  let score = matched * 20;
  if (tokens.length && matched === tokens.length) score += 60;
  if (titles.includes(wanted)) score += 300;
  else if (titles.some((title) => title.startsWith(wanted))) score += 200;
  else if (all.includes(wanted)) score += 120;
  return score;
}

/** Best title first. Ties keep the source's own order. */
export const rankMovies = (movies: MovieCard[], keyword: string) =>
  movies
    .map((movie) => ({ movie, score: scoreMovie(movie, keyword) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.movie);

/** Shorter searches for when the full wording finds little. */
export function fallbackQueries(keyword: string) {
  const tokens = tokensOf(keyword);
  if (tokens.length < 2) return [];
  return [
    ...new Set([
      `${tokens[0]} ${tokens[1]}`,
      ...tokens.filter((token) => token.length >= 3),
    ]),
  ]
    .filter((query) => query !== normalizeTitle(keyword))
    .slice(0, 3);
}

/** A wider search brings in noise: keep films matching at least half of the words. */
export function isCloseEnough(movie: MovieCard, keyword: string) {
  const tokens = tokensOf(keyword);
  const all = normalizeTitle(
    `${movie.name} ${movie.originalName} ${(movie.altNames ?? []).join(" ")}`,
  );
  const matched = tokens.filter((token) => all.includes(token)).length;
  return matched > 0 && matched * 2 >= tokens.length;
}
