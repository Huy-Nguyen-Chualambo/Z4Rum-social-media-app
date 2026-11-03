import { test } from "node:test";
import assert from "node:assert/strict";
import { posterUrl } from "./posterUrl";

test("the primary source's posters go through the optimizer", () => {
  assert.equal(
    posterUrl("https://phimimg.com/uploads/a b.webp"),
    "/_next/image?url=https%3A%2F%2Fphimimg.com%2Fuploads%2Fa%20b.webp&w=256&q=75",
  );
});

test("anything else keeps its address", () => {
  for (const src of ["https://img.nguonc.example/a.jpg", "https://phimimg.com.evil.example/a.jpg", "", "not a url"])
    assert.equal(posterUrl(src), src);
});
