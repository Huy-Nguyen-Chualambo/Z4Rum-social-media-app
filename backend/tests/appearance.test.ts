import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAppearance,
  defaultAppearance,
  onAppearanceSaved,
  publishAppearance,
} from "../src/world/appearance";
test("appearance accepts only the complete allowlisted shape, never user IDs", () => {
  const value = { character: "peach", hair: "copper", outfit: "mint" };
  assert.deepEqual(parseAppearance(value), value);
  for (const input of [
    null,
    [],
    {},
    { ...value, userId: "other" },
    { ...value, hair: "red" },
    { ...value, character: 2 },
    { character: "peach" },
  ])
    assert.equal(parseAppearance(input), null);
  assert.deepEqual(defaultAppearance("fixed"), defaultAppearance("fixed"));
});
test("appearance publication can unsubscribe without leaking room listeners", () => {
  const received: string[] = [];
  const unsubscribe = onAppearanceSaved((id) => received.push(id));
  publishAppearance("a", defaultAppearance("a"));
  unsubscribe();
  publishAppearance("b", defaultAppearance("b"));
  assert.deepEqual(received, ["a"]);
});
