import { test } from "node:test";
import assert from "node:assert/strict";
import { findPath, isWalkable, unproject, type Geometry } from "./navigation";
import { project } from "./projection";
const geometry: Geometry = {
  width: 1000,
  height: 700,
  blocks: [{ x: 440, y: 300, w: 120, h: 100 }],
  trunks: [{ x: 240, y: 540 }],
};
test("click projection round trips world points", () => {
  for (const p of [
    { x: 20, y: 20 },
    { x: 350, y: 440 },
    { x: 980, y: 680 },
  ]) {
    const screen = project(p.x, p.y),
      q = unproject(screen.x, screen.y);
    assert.ok(Math.hypot(q.x - p.x, q.y - p.y) < 0.0001);
  }
});
test("A* routes around fountain without crossing inflated corners", () => {
  let previous = { x: 350, y: 350 };
  const path = findPath(previous, { x: 650, y: 350 }, geometry);
  assert.ok(path.length > 10);
  for (const p of path) {
    const n = Math.ceil(Math.hypot(p.x - previous.x, p.y - previous.y));
    for (let i = 0; i <= n; i++)
      assert.ok(
        isWalkable(
          {
            x: previous.x + ((p.x - previous.x) * i) / (n || 1),
            y: previous.y + ((p.y - previous.y) * i) / (n || 1),
          },
          geometry,
        ),
      );
    previous = p;
  }
  assert.deepEqual(path.at(-1), { x: 650, y: 350 });
});
test("invalid targets are rejected and solid targets stop at safe nearby cell", () => {
  assert.deepEqual(
    findPath({ x: 350, y: 440 }, { x: NaN, y: 3 }, geometry),
    [],
  );
  assert.deepEqual(
    findPath({ x: 350, y: 440 }, { x: 1100, y: 3 }, geometry),
    [],
  );
  const path = findPath({ x: 350, y: 440 }, { x: 450, y: 350 }, geometry);
  assert.ok(path.length && isWalkable(path.at(-1)!, geometry));
});
