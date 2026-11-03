/** Checks the real film sources against what the app expects, because the browser checks use a stand-in.
 * Needs network access. Run on demand with `npm run test:theater:live`; never part of `npm test`.
 */
import assert from "node:assert/strict";
import {
  backupLacks,
  countries,
  genres,
  getMovie,
  listMovies,
  nguoncListUrl,
  shelves,
  smartSearch,
  type MovieFilters,
} from "../../frontend/lib/theater/movies";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hasFilms = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 404) return false;
  assert.ok(response.ok, `${url} answered ${response.status}`);
  const data = (await response.json()) as { items?: unknown[] };
  return Boolean(data.items?.length);
};

(async () => {
  for (const { key } of shelves)
    assert.ok((await listMovies("phimapi", key, 1)).movies.length, `shelf ${key} has films`);
  console.log("PASS every shelf on the primary source has films");

  const combined: MovieFilters = { genre: "hanh-dong", country: "han-quoc", year: "2024" };
  const narrowed = await listMovies("phimapi", "latest", 1, combined);
  assert.ok(narrowed.movies.length && narrowed.movies.every((film) => film.year === "2024"));
  assert.ok((await listMovies("phimapi", "latest", 1, { language: "long-tieng", year: "2010,2015", sort: "year" })).movies.length);
  console.log("PASS filters combine on the primary source");

  const found = await smartSearch("phimapi", "nguoi nhen", 1);
  assert.equal(found.movies[0].name, "Người Nhện", "the exact title comes first");
  const film = await getMovie("phimapi", found.movies[0].slug);
  const episode = film.servers[0]?.episodes[0];
  assert.ok(episode?.stream.startsWith("https://"), "the primary source gives a direct stream");
  assert.ok(film.poster.startsWith("https://phimimg.com/"), "posters are on the host the optimizer allows");
  console.log("PASS search ranks titles, and a film has a stream and a poster");

  assert.ok((await listMovies("nguonc", "latest", 1)).movies.length);
  for (const key of ["single", "series", "anime", "tv"] as const)
    assert.ok(await hasFilms(nguoncListUrl(key, {}, 1)), `backup shelf ${key} has films`);
  const wrong: string[] = [];
  for (const [kind, options] of [["genre", genres], ["country", countries]] as const)
    for (const [slug] of options) {
      // A lacked slug is dropped before building a URL, so ask for it by its own address.
      const lacked = backupLacks.has(slug);
      const path = kind === "genre" ? "the-loai" : "quoc-gia";
      const url = lacked
        ? `https://phim.nguonc.com/api/films/${path}/${slug}?page=1`
        : nguoncListUrl("latest", { [kind]: slug }, 1);
      if ((await hasFilms(url)) === lacked) wrong.push(`${kind} ${slug}`);
      await delay(400);
    }
  assert.deepEqual(wrong, [], "the backup's list of missing filters is out of date");
  console.log("PASS the backup has exactly the lists the app offers on it");
  console.log("ALL LIVE CHECKS PASSED");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
