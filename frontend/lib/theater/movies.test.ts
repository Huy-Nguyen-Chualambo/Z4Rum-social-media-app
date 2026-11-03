import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backupFilters,
  findOnSource,
  getMovie,
  listMovies,
  nguoncListUrl,
  phimapiListUrl,
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

test("a network failure reads as a sentence, not a browser error", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  await assert.rejects(listMovies("phimapi", "anime", 77), /Không kết nối được/);
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

test("a stalled request gets a second try, and the first answer wins", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  let aborted = false;
  globalThis.fetch = ((_url: string, init: RequestInit) => {
    calls++;
    if (calls === 1)
      return new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        });
      });
    return Promise.resolve(new Response(JSON.stringify(phimapiDetail("cham"))));
  }) as typeof fetch;
  try {
    const started = Date.now();
    assert.equal((await getMovie("phimapi", "cham")).slug, "cham");
    assert.equal(calls, 2);
    assert.ok(Date.now() - started >= 1900, "a quick answer never needs the spare");
    assert.equal(aborted, true, "the stalled request is cancelled");
  } finally {
    globalThis.fetch = original;
  }
});

test("a body that stalls after its headers counts as slow too", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 1)
      return { ok: true, status: 200, json: () => new Promise(() => {}) } as Response;
    return new Response(JSON.stringify(phimapiDetail("nghen")));
  }) as typeof fetch;
  try {
    assert.equal((await getMovie("phimapi", "nghen")).slug, "nghen");
  } finally {
    globalThis.fetch = original;
  }
});

test("a quick failure reports at once rather than trying again", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await assert.rejects(getMovie("phimapi", "loi-nhanh"));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("when both tries stall the wait still ends", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return new Promise(() => {});
  }) as typeof fetch;
  try {
    await assert.rejects(getMovie("phimapi", "ket"), { name: "TimeoutError" });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("filters combine on the primary source", () => {
  assert.equal(phimapiListUrl("latest", {}, 2), `${PHIMAPI}danh-sach/phim-moi-cap-nhat-v3?page=2`);
  const params = (url: string) => Object.fromEntries(new URL(url).searchParams);
  const single = phimapiListUrl("single", { genre: "kinh-di", country: "nhat-ban", year: "2010,2015", language: "long-tieng", sort: "year" }, 3);
  assert.ok(single.startsWith(`${PHIMAPI}v1/api/danh-sach/phim-le?`));
  assert.deepEqual(params(single), { limit: "24", page: "3", category: "kinh-di", country: "nhat-ban", year: "2010,2015", sort_lang: "long-tieng", sort_field: "year", sort_type: "desc" });
  assert.ok(phimapiListUrl("latest", { genre: "tam-ly" }, 1).startsWith(`${PHIMAPI}v1/api/danh-sach?`));
  assert.ok(phimapiListUrl("cinema", {}, 1).includes("/danh-sach/phim-chieu-rap?"));
});

test("the backup takes one filter, under its own names", () => {
  assert.deepEqual(backupFilters({ genre: "tam-ly", country: "my", language: "vietsub" }), { genre: "tam-ly" });
  assert.deepEqual(backupFilters({ year: "2010,2015", language: "vietsub", sort: "year" }), {});
  assert.equal(nguoncListUrl("latest", { genre: "hai-huoc", year: "2024" }, 1), `${NGUONC}films/the-loai/phim-hai?page=1`);
  assert.equal(nguoncListUrl("latest", { country: "au-my" }, 2), `${NGUONC}films/quoc-gia/my?page=2`);
  assert.equal(nguoncListUrl("latest", { year: "2024" }, 1), `${NGUONC}films/nam-phat-hanh/2024?page=1`);
  assert.equal(nguoncListUrl("tv", { language: "vietsub" }, 1), `${NGUONC}films/danh-sach/tv-shows?page=1`);
});

test("the primary source's details reach the film, and unsafe or empty ones do not", () => {
  const base = phimapiDetail("chi-tiet");
  const movie = phimapiMovie({
    ...base,
    movie: { ...base.movie, quality: "FHD", lang: "Vietsub", tmdb: { vote_average: 8.46, vote_count: 10 }, alternative_names: ["Other", "", "Khác"], country: [{ name: "Nhật Bản" }], director: ["Đang cập nhật"], actor: ["A", "", "B"], trailer_url: "https://www.youtube.com/watch?v=x" },
    episodes: [{ server_name: "Vietsub", is_ai: true, server_data: base.episodes[0].server_data }],
  });
  assert.deepEqual(
    [movie.quality, movie.language, movie.rating, movie.altNames, movie.countries, movie.directors, movie.actors, movie.trailer],
    ["FHD", "Vietsub", 8.46, ["Other", "Khác"], ["Nhật Bản"], [], ["A", "B"], "https://www.youtube.com/watch?v=x"],
  );
  assert.equal(movie.servers[0].name, "Vietsub (AI)");
  const shaky = (extra: object) => phimapiMovie({ ...base, movie: { ...base.movie, ...extra } });
  assert.equal(shaky({ tmdb: { vote_average: 9, vote_count: 2 } }).rating, 0, "too few votes");
  assert.equal(shaky({ tmdb: { vote_average: 99, vote_count: 50 } }).rating, 0);
  for (const trailer_url of ["javascript:alert(1)", "https://evil.example/youtube.com/x", "http://www.youtube.com/x", "https://youtube.com.evil.example/x", ""])
    assert.equal(shaky({ trailer_url }).trailer, "", trailer_url);
});

test("another title helps find the same film on the other source", async (t) => {
  const film = { ...phimapiMovie(phimapiDetail("ten-khac")), altNames: ["Tên Chung"] };
  const other = nguoncDetail("ben-kia");
  mockApi(t, {
    [`${NGUONC}films/search?keyword=${encodeURIComponent(film.name)}&page=1`]: { items: [{ slug: "ben-kia" }] },
    [`${NGUONC}film/ben-kia`]: { movie: { ...other.movie, name: "Tên Chung", original_name: "Khác hẳn" } },
  });
  assert.equal((await findOnSource(film, "nguonc"))?.slug, "ben-kia");
});
