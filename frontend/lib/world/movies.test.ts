import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findOnSource,
  getMovie,
  listMovies,
  matchEpisode,
  nguoncMovie,
  phimapiMovie,
  searchMovies,
} from "./movies";

const PHIMAPI = "https://phimapi.com/";
const NGUONC = "https://phim.nguonc.com/api/";
const safe = [{ name: "Hành động" }];
const card = (slug: string, category: unknown = safe) => ({
  slug,
  name: `Phim ${slug}`,
  origin_name: `Film ${slug}`,
  year: 2026,
  poster_url: `uploads/${slug}.webp`,
  category,
});
const phimapiDetail = (slug: string, category: unknown = safe) => ({
  movie: { ...card(slug, category), content: "<p>Hay &amp; cảm động</p>", time: " phút/tập" },
  episodes: [
    {
      server_name: "Vietsub",
      server_data: [
        { name: "Tập 01", slug: "tap-01", link_m3u8: "https://cdn.example/1.m3u8", link_embed: "https://p.example/1" },
        { name: "Tập 02", slug: "tap-02", link_m3u8: "javascript:alert(1)", link_embed: "" },
      ],
    },
  ],
});
const nguoncCategories = (...genres: string[]) => ({
  "1": { group: { name: "Thể loại" }, list: genres.map((name) => ({ name })) },
});
const nguoncDetail = (slug: string, category: unknown = nguoncCategories("Hành động")) => ({
  movie: {
    slug,
    name: `Phim ${slug}`,
    original_name: `Film ${slug}`,
    year: 2026,
    thumb_url: `https://img.example/${slug}.jpg`,
    category,
    episodes: [
      {
        server_name: "Vietsub #1",
        items: [
          { name: "1", slug: "tap-1", embed: "https://embed.example/1" },
          { name: "2", slug: "tap-2", embed: "javascript:alert(1)" },
        ],
      },
    ],
  },
});

function mockApi(
  t: { after: (fn: () => void) => void },
  routes: Record<string, unknown>,
) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    const body = routes[url];
    return body === undefined
      ? new Response("{}", { status: url.includes("quota") ? 429 : 404 })
      : new Response(JSON.stringify(body));
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

test("each source's film becomes the same shape, without unsafe players", () => {
  const direct = phimapiMovie(phimapiDetail("a"));
  assert.equal(direct.adult, false);
  assert.equal(direct.poster, "https://phimimg.com/uploads/a.webp");
  assert.equal(direct.description, "Hay & cảm động");
  assert.equal(direct.time, "", "a duration with no number is dropped");
  assert.deepEqual(direct.servers[0].episodes, [
    { name: "Tập 01", slug: "tap-01", stream: "https://cdn.example/1.m3u8", embed: "https://p.example/1" },
  ]);
  const embedded = nguoncMovie(nguoncDetail("a"));
  assert.equal(embedded.source, "nguonc");
  assert.deepEqual(embedded.servers[0].episodes, [
    { name: "1", slug: "tap-1", stream: "", embed: "https://embed.example/1" },
  ]);
});

test("18+ and unclassified films count as adult on both sources", () => {
  assert.equal(phimapiMovie(phimapiDetail("a", [{ name: "Phim 18+" }])).adult, true);
  assert.equal(phimapiMovie(phimapiDetail("a", [])).adult, true);
  assert.equal(nguoncMovie(nguoncDetail("a", nguoncCategories("Phim 18+"))).adult, true);
  assert.equal(nguoncMovie(nguoncDetail("a", {})).adult, true);
});

test("the primary source filters from the list, with a single request", async (t) => {
  const calls = mockApi(t, {
    [`${PHIMAPI}v1/api/danh-sach/phim-le?limit=24&page=1`]: {
      data: {
        items: [card("ok"), card("nguoi-lon", [{ name: "Phim 18+" }]), card("khong-nhan", [])],
        params: { pagination: { currentPage: 1, totalPages: 5 } },
      },
    },
  });
  const result = await listMovies("phimapi", "single", 1);
  assert.deepEqual(result.movies.map((movie) => movie.slug), ["ok"]);
  assert.equal(result.totalPages, 5);
  assert.equal(calls.length, 1);
});

test("the backup source looks films up and hides what it cannot check", async (t) => {
  mockApi(t, {
    [`${NGUONC}films/phim-moi-cap-nhat?page=1`]: {
      items: [{ slug: "ok" }, { slug: "nguoi-lon" }, { slug: "mat-tich" }],
      paginate: { current_page: 1, total_page: 3 },
    },
    [`${NGUONC}film/ok`]: nguoncDetail("ok"),
    [`${NGUONC}film/nguoi-lon`]: nguoncDetail("nguoi-lon", nguoncCategories("Phim 18+")),
  });
  const result = await listMovies("nguonc", "latest", 1);
  assert.deepEqual(result.movies.map((movie) => movie.slug), ["ok"]);
  assert.equal(result.totalPages, 3);
});

test("a broken response is an error, so the panel can fall back", async (t) => {
  mockApi(t, {
    [`${PHIMAPI}danh-sach/phim-moi-cap-nhat-v3?page=9`]: { unexpected: true },
    [`${PHIMAPI}phim/rong`]: { status: false },
    [`${NGUONC}films/danh-sach/phim-bo?page=9`]: { items: [{ slug: "x" }] },
  });
  await assert.rejects(listMovies("phimapi", "latest", 9), /Không tải được/);
  await assert.rejects(getMovie("phimapi", "rong"), /Không tải được/);
  await assert.rejects(listMovies("nguonc", "series", 9), /Không tải được/);
});

test("rate limiting shows a useful error and is not cached", async (t) => {
  const keyword = "quota";
  const calls = mockApi(t, {});
  await assert.rejects(searchMovies("nguonc", keyword, 1), /quá tải/);
  await assert.rejects(searchMovies("nguonc", keyword, 1), /quá tải/);
  assert.equal(calls.length, 2);
});

test("repeat requests are cached and keywords are encoded", async (t) => {
  const keyword = "người nhện&page=9";
  const url = `${PHIMAPI}v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24&page=1`;
  const calls = mockApi(t, { [url]: { data: { items: [card("nhen")] } } });
  await searchMovies("phimapi", keyword, 1);
  await searchMovies("phimapi", keyword, 1);
  assert.deepEqual(calls, [url]);
});

test("the same film is found on the other source by title and year", async (t) => {
  const film = phimapiMovie(phimapiDetail("tim"));
  const search = (keyword: string) =>
    `${NGUONC}films/search?keyword=${encodeURIComponent(keyword)}&page=1`;
  const other = nguoncDetail("tim");
  const differentYear = { movie: { ...nguoncDetail("cu").movie, name: film.name, original_name: "Khác", year: 1999 } };
  mockApi(t, {
    [search(film.name)]: { items: [{ slug: "cu" }, { slug: "tim" }] },
    [`${NGUONC}film/cu`]: differentYear,
    [`${NGUONC}film/tim`]: { movie: { ...other.movie, name: film.name } },
  });
  assert.equal((await findOnSource(film, "nguonc"))?.slug, "tim");
});

test("a film missing from the other source returns nothing", async (t) => {
  const film = phimapiMovie(phimapiDetail("khong-co"));
  mockApi(t, {
    [`${NGUONC}films/search?keyword=${encodeURIComponent(film.name)}&page=1`]: { items: [] },
    [`${NGUONC}films/search?keyword=${encodeURIComponent(film.originalName)}&page=1`]: { items: [] },
  });
  assert.equal(await findOnSource(film, "nguonc"), null);
});

test("episodes match across naming styles", () => {
  const backup = nguoncMovie(nguoncDetail("a"));
  assert.equal(matchEpisode(backup, "Tập 01")?.episode.slug, "tap-1");
  const movie = phimapiMovie(phimapiDetail("a"));
  assert.equal(matchEpisode(movie, "1")?.episode.slug, "tap-01");
  assert.equal(matchEpisode(movie, "99")?.episode.slug, "tap-01", "falls back to the first");
});
