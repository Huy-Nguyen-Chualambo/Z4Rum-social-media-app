import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKS,
  FULL_MOVE_CREDIT,
  SIZE,
  TREE_TRUNKS,
  moveCredit,
  step,
} from "../../../backend/src/world/rules";
import { advanceRoute, createMoveTracker, nearWaypoint } from "./movement";
import { findPath, type Geometry } from "./navigation";
import type { Point } from "./projection";

const geometry: Geometry = { ...SIZE, blocks: BLOCKS, trunks: TREE_TRUNKS };
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** Plays the client tick against the real server rules, over a delayed link. */
function walk(start: Point, goal: Point, rtt: number, jitter = 0) {
  const random = seeded(rtt + jitter + 7);
  const moves = createMoveTracker();
  let route = findPath(start, goal, geometry);
  const expected = route.at(-1)!;
  let server = { ...start };
  let client = { ...start };
  let credit = FULL_MOVE_CREDIT;
  let lastMove = 0;
  let lastArrival = 0;
  let walked = 0;
  const inbound: { at: number; dx: number; dy: number }[] = [];
  const outbound: { at: number; position: Point }[] = [];
  for (let now = 0; now < 30_000; now += 5) {
    while (inbound.length && inbound[0].at <= now) {
      const move = inbound.shift()!;
      credit = moveCredit(credit, move.at - lastMove);
      lastMove = move.at;
      if (credit >= 1) {
        credit -= 1;
        const next = step(server.x, server.y, move.dx, move.dy);
        walked += Math.hypot(next.x - server.x, next.y - server.y);
        server = next;
      }
      outbound.push({ at: now + rtt / 2, position: { ...server } });
    }
    while (outbound.length && outbound[0].at <= now) {
      client = outbound.shift()!.position;
      moves.confirmed();
    }
    if (now % 60) continue;
    const at = moves.predict(client, now);
    route = advanceRoute(route, at, moves.settled(now));
    if (!route.length) return { end: client, expected, walked, finished: now };
    if (route.length === 1 && nearWaypoint(at, route[0])) continue;
    const length = Math.hypot(route[0].x - at.x, route[0].y - at.y);
    const dx = (route[0].x - at.x) / length,
      dy = (route[0].y - at.y) / length;
    moves.sent(dx, dy, now);
    // TCP keeps order, so a late packet holds back the ones behind it.
    lastArrival = Math.max(lastArrival, now + rtt / 2 + random() * jitter);
    inbound.push({ at: lastArrival, dx, dy });
  }
  return { end: client, expected, walked, finished: Infinity };
}

const routes = [
  [{ x: 350, y: 440 }, { x: 820, y: 560 }],
  [{ x: 820, y: 560 }, { x: 200, y: 600 }],
  [{ x: 350, y: 440 }, { x: 805, y: 250 }],
  [{ x: 350, y: 440 }, { x: 180, y: 300 }],
];
for (const [rtt, jitter] of [
  [0, 0],
  [30, 0],
  [80, 0],
  [150, 0],
  [300, 0],
  [600, 0],
  [80, 60],
  [150, 120],
  [300, 200],
])
  test(`a tapped route arrives directly at ${rtt}ms, jitter ${jitter}ms`, () => {
    for (const [from, to] of routes) {
      const direct = walk(from, to, 0);
      const result = walk(from, to, rtt, jitter);
      assert.ok(result.finished < 15_000, "never arrived");
      assert.ok(
        Math.hypot(
          result.end.x - result.expected.x,
          result.end.y - result.expected.y,
        ) <= 6,
        "stopped short of the tap",
      );
      assert.ok(
        result.walked <= direct.walked + 40,
        `walked ${result.walked}, direct ${direct.walked}`,
      );
    }
  });

test("the tracker forgets moves the server never answered", () => {
  const moves = createMoveTracker();
  moves.sent(1, 0, 0);
  moves.sent(0, 1, 0);
  assert.deepEqual(moves.predict({ x: 0, y: 0 }, 10), { x: 10, y: 10 });
  moves.confirmed();
  assert.deepEqual(moves.predict({ x: 10, y: 0 }, 10), { x: 10, y: 10 });
  assert.equal(moves.settled(10), false);
  assert.deepEqual(moves.predict({ x: 10, y: 0 }, 2000), { x: 10, y: 0 });
  assert.equal(moves.settled(2000), true);
});
