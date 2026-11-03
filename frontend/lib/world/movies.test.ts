import { test } from "node:test";
import assert from "node:assert/strict";
import { listMovies, searchMovies, toMovie } from "./movies";

const categories = (...genres: string[]) => ({
  "1": { group: { name: "Định dạng" }, list: [{ name: "Phim lẻ" }] },
  "2": {
    group: { name: "Thể loại" },
    list: genres.map((name) => ({ name })),
  },
});
const film = (slug: string, category: unknown = categories("Hành động")) => ({
  slug,
  name: `Phim ${slug}`,
  thumb_url: `https://img.example/${slug}.jpg`,
  category,
  description: "<p>Hay &amp; cảm động&nbsp;lắm</p>",
  episodes: [
    {
      server_name: "Vietsub #1",
      items: [
        { name: "1", slug: "tap-1", embed: "https://embed.example/1" },
        { name: "2", slug: "tap-2", embed: "javascript:alert(1)" },
      ],
    },
    { server_name: "Trống", items: [{ name: "1", slug: "tap-1", embed: "" }] },
  ],
});

test("films are normalized and unsafe players are dropped", () => {
  const movie = toMovie(film("a"));
  assert.equal(movie.adult, false);
  assert.equal(movie.description, "Hay & cảm động lắm");
  assert.deepEqual(movie.genres, ["Hành động"]);
  assert.deepEqual(movie.servers, [
    {
      name: "Vietsub #1",
      episodes: [{ name: "1", slug: "tap-1", embed: "https://embed.example/1" }],
    },
  ]);
  assert.equal(toMovie({ ...film("a"), thumb_url: "http://x/y.jpg" }).poster, "");
});

test("18+ and unclassified films count as adult", () => {
  assert.equal(toMovie(film("a", categories("Phim 18+"))).adult, true);
  assert.equal(toMovie(film("a", {})).adult, true);
  assert.equal(toMovie({ ...film("a"), category: undefined }).adult, true);
});

function mockApi(t: { after: (fn: () => void) => void }, routes: Record<string, unknown>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string) => {
    const path = input.replace("https://phim.nguonc.com/api/", "");
    calls.push(path);
    const body = routes[path];
    return body === undefined
      ? new Response("{}", { status: path.includes("quota") ? 429 : 404 })
      : new Response(JSON.stringify(body));
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

test("lists hide 18+ films and films that cannot be checked", async (t) => {
  mockApi(t, {
    "films/list-a?page=1": {
      items: [{ slug: "ok" }, { slug: "nguoi-lon" }, { slug: "mat-tich" }],
      paginate: { current_page: 1, total_page: 3 },
    },
    "film/ok": { movie: film("ok") },
    "film/nguoi-lon": { movie: film("nguoi-lon", categories("Phim 18+")) },
  });
  const result = await listMovies("films/list-a", 1);
  assert.deepEqual(
    result.movies.map((movie) => movie.slug),
    ["ok"],
  );
  assert.equal(result.totalPages, 3);
});

test("repeat requests are cached and keywords are encoded", async (t) => {
  const keyword = "người nhện&page=9";
  const path = `films/search?keyword=${encodeURIComponent(keyword)}&page=1`;
  const calls = mockApi(t, {
    [path]: { items: [{ slug: "nhen" }] },
    "film/nhen": { movie: film("nhen") },
  });
  await searchMovies(keyword, 1);
  await searchMovies(keyword, 1);
  assert.deepEqual(calls, [path, "film/nhen"]);
});

test("rate limiting shows a useful error and is not cached", async (t) => {
  const calls = mockApi(t, {});
  await assert.rejects(listMovies("films/quota", 1), /quá tải/);
  await assert.rejects(listMovies("films/quota", 1), /quá tải/);
  assert.equal(calls.length, 2);
});

test("a failed lookup of every film is an error, not an empty shelf", async (t) => {
  mockApi(t, {
    "films/list-b?page=1": { items: [{ slug: "x" }, { slug: "y" }] },
  });
  await assert.rejects(listMovies("films/list-b", 1), /Không tải được/);
});
