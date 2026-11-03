import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLibrary, withSaved, withWatched } from "./library";
import type { MovieCard } from "./movies";

const film: MovieCard = { source: "phimapi", slug: "a", name: "A", originalName: "", year: "2026", poster: "", status: "", adult: false };
const place = { server: 0, episode: "tap-1", episodeName: "Tập 1" };
const empty = { saved: [], history: [] };

test("saving toggles, and stores only the card", () => {
  const saved = withSaved(empty, { ...film, description: "dài" } as MovieCard);
  assert.deepEqual(saved.saved, [film]);
  assert.deepEqual(withSaved(saved, film).saved, []);
});

test("the same film on another source is a separate entry", () => {
  const saved = withSaved(withSaved(empty, film), { ...film, source: "nguonc" });
  assert.equal(saved.saved.length, 2);
});

test("watching keeps one entry per film, newest first, and a cap", () => {
  let library: ReturnType<typeof parseLibrary> = withWatched(empty, film, place, 100.7, 1000, 1);
  assert.equal(library.history[0].position, 100);
  library = withWatched(library, { ...film, slug: "b" }, place, 5, 1000, 2);
  library = withWatched(library, film, { ...place, episode: "tap-2" }, 9, 1000, 3);
  assert.deepEqual(library.history.map((f) => [f.slug, f.episode]), [["a", "tap-2"], ["b", "tap-1"]]);
  for (let i = 0; i < 40; i++) library = withWatched(library, { ...film, slug: `f${i}` }, place, 1, 10, i);
  assert.equal(library.history.length, 24);
});

test("a film watched to the end starts over", () => {
  assert.equal(withWatched(empty, film, place, 960, 1000, 1).history[0].position, 0);
  assert.equal(withWatched(empty, film, place, 900, 1000, 1).history[0].position, 900);
  assert.equal(withWatched(empty, film, place, 900, 0, 1).history[0].position, 900, "unknown length");
});

test("the card's quality, language and score are kept, and bad ones refused", () => {
  const rich = { ...film, quality: "FHD", language: "Vietsub", rating: 8.5 };
  assert.deepEqual(withSaved(empty, { ...rich, altNames: ["x"] }).saved, [rich]);
  assert.deepEqual(parseLibrary(JSON.stringify({ saved: [rich, { ...rich, rating: 50 }, { ...rich, quality: 1 }] })).saved, [rich]);
});

test("damaged or edited storage is ignored entry by entry", () => {
  assert.deepEqual(parseLibrary("{not json"), empty);
  assert.deepEqual(parseLibrary(null), empty);
  assert.deepEqual(parseLibrary('{"saved":"x","history":7}'), empty);
  const saved = [film, { ...film, slug: "../x" }, { ...film, poster: "javascript:alert(1)" }, { ...film, adult: true }, { ...film, source: "evil" }, { ...film, source: "constructor" }, null];
  assert.deepEqual(parseLibrary(JSON.stringify({ saved })).saved, [film]);
  const watched = { ...film, ...place, position: 5, at: 1 };
  const history = [watched, { ...watched, position: -1 }, { ...watched, episode: "<b>" }, { ...watched, server: 1.5 }];
  assert.deepEqual(parseLibrary(JSON.stringify({ history })).history, [watched]);
});
