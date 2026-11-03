import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWatch, watchPath } from "./watchLink";

const film = { source: "phimapi", slug: "ten-phim", server: 1, episode: "tap-2" } as const;
const read = (path: string) =>
  parseWatch(Object.fromEntries(new URL(path, "http://x").searchParams));

test("a watch link round-trips the film and the moment", () => {
  assert.deepEqual(read(watchPath(film, 754.9)), { film, position: 754 });
  assert.equal(new URL(watchPath(film), "http://x").searchParams.has("t"), false);
});

test("a tampered watch link is refused", () => {
  const good = { source: "phimapi", slug: "a", server: "0", episode: "b" };
  assert.ok(parseWatch(good));
  for (const bad of [
    { ...good, source: "evil" },
    { ...good, slug: "../admin" },
    { ...good, episode: "<b>" },
    { ...good, server: "-1" },
    { ...good, slug: ["a", "b"] },
    {},
  ])
    assert.equal(parseWatch(bad), null);
  assert.equal(parseWatch({ ...good, t: "abc" })?.position, 0);
});
