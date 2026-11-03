import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./nextPath";

test("a path on this site is kept with its query", () => {
  assert.equal(safeNext("/z4theater/abc"), "/z4theater/abc");
  assert.equal(safeNext("/z4theater/watch?slug=a&t=5"), "/z4theater/watch?slug=a&t=5");
});

test("anything that could leave the site is refused", () => {
  for (const bad of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "",
    undefined,
    ["/a"],
  ])
    assert.equal(safeNext(bad), null, String(bad));
});
