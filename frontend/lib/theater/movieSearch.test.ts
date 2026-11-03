import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fallbackQueries,
  isCloseEnough,
  normalizeTitle,
  rankMovies,
} from "./movieSearch";
import type { MovieCard } from "./movies";

const film = (name: string, originalName = ""): MovieCard => ({
  source: "phimapi",
  slug: name,
  name,
  originalName,
  year: "",
  poster: "",
  status: "",
  adult: false,
});

test("titles fold accents, including đ", () => {
  assert.equal(normalizeTitle("Đại  Chiến: Người Nhện!"), "dai chien nguoi nhen");
});

test("the exact title beats the source's order, typed with or without accents", () => {
  const list = ["Người Nhện: Khởi Đầu Mới", "Người Nhện 3", "Người Nhện", "Spider"].map((n) => film(n));
  assert.equal(rankMovies(list, "nguoi nhen")[0].name, "Người Nhện");
  assert.equal(rankMovies(list, "Người Nhện")[0].name, "Người Nhện");
});

test("an original title counts, and ties keep their order", () => {
  const list = [film("Khác"), film("Người Nhện", "Spider-Man, Spidey")];
  assert.equal(rankMovies(list, "spidey")[0].name, "Người Nhện");
  assert.deepEqual(rankMovies([film("A"), film("B")], "zzz").map((m) => m.name), ["A", "B"]);
});

test("wider searches come only from several words, without repeating the search", () => {
  assert.deepEqual(fallbackQueries("nhen"), []);
  assert.deepEqual(fallbackQueries("nguoi nhen"), ["nguoi", "nhen"]);
  assert.equal(fallbackQueries("nguoi nhen giang ho").length, 3);
});

test("a wider search drops films matching too few words", () => {
  assert.equal(isCloseEnough(film("Người Nhện"), "nguoi nhen giang ho"), true);
  assert.equal(isCloseEnough(film("Người Vợ"), "nguoi nhen giang ho"), false);
});
