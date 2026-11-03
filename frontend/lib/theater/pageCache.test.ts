import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { cachedPage, onPageRefresh } from "./pageCache";
import type { MovieCard, MoviePage } from "./movies";

const film = (slug: string): MovieCard => ({ source: "phimapi", slug, name: slug, originalName: "", year: "2026", poster: "", status: "", adult: false });
const page = (...slugs: string[]): MoviePage => ({ movies: slugs.map(film), page: 1, totalPages: 2 });
const KEY = "z4theater_pages";
const store = new Map<string, string>();
const seed = (url: string, value: MoviePage, age: number) =>
  store.set(KEY, JSON.stringify({ [url]: { at: Date.now() - age, page: value } }));
const MINUTE = 60_000;
const tick = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
});

test("a first visit loads and remembers, and a repeat skips the network", async () => {
  let loads = 0;
  const load = async () => (loads++, page("a"));
  assert.deepEqual((await cachedPage("u", load)).movies.map((m) => m.slug), ["a"]);
  assert.deepEqual((await cachedPage("u", load)).movies.map((m) => m.slug), ["a"]);
  assert.equal(loads, 1);
});

test("an old page shows at once and announces a change once it has checked", async () => {
  seed("u", page("old"), 10 * MINUTE);
  let announced = 0;
  const off = onPageRefresh(() => announced++);
  const shown = await cachedPage("u", async () => page("new"));
  assert.equal(shown.movies[0].slug, "old");
  await tick();
  assert.equal(announced, 1);
  assert.equal((await cachedPage("u", async () => page("x"))).movies[0].slug, "new");
  off();
});

test("an old page that has not changed stays quiet", async () => {
  seed("u", page("same"), 10 * MINUTE);
  let announced = 0;
  const off = onPageRefresh(() => announced++);
  await cachedPage("u", async () => page("same"));
  await tick();
  assert.equal(announced, 0);
  off();
});

test("when the source is down an old page still shows, but a very old one does not", async () => {
  seed("u", page("old"), 10 * MINUTE);
  const down = async () => { throw new Error("down"); };
  assert.equal((await cachedPage("u", down)).movies[0].slug, "old");
  seed("u", page("old"), 4 * 24 * 60 * MINUTE);
  await assert.rejects(cachedPage("u", down));
});

test("an empty answer is not remembered", async () => {
  await cachedPage("u", async () => page());
  assert.equal(store.has(KEY), false);
});

test("damaged storage or unsafe entries are ignored", async () => {
  store.set(KEY, "{not json");
  assert.equal((await cachedPage("u", async () => page("a"))).movies[0].slug, "a");
  store.set(KEY, JSON.stringify({ u: { at: Date.now(), page: { movies: [{ ...film("x"), adult: true }, { ...film("y"), poster: "javascript:alert(1)" }, film("ok")] } } }));
  assert.deepEqual((await cachedPage("u", async () => page("z"))).movies.map((m) => m.slug), ["ok"]);
});

test("the cache keeps the newest pages only and works with no storage at all", async () => {
  for (let i = 0; i < 35; i++) await cachedPage(`u${i}`, async () => page("a"));
  assert.equal(Object.keys(JSON.parse(store.get(KEY)!)).length, 30);
  delete (globalThis as { localStorage?: unknown }).localStorage;
  assert.equal((await cachedPage("none", async () => page("a"))).movies[0].slug, "a");
});
