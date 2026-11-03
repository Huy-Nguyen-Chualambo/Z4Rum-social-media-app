import type { Point } from "./projection";

const STEP = 10; // World units the server moves per accepted world:move.
const ARRIVED = 6;
// A move the server rate-limits is never echoed, so it has to age out.
const UNCONFIRMED_MS = 1000;

/**
 * Moves sent but not yet echoed. Server positions are one round trip old, and
 * steering by them alone overshoots every waypoint and circles it forever.
 */
export function createMoveTracker() {
  let sent: { x: number; y: number; at: number }[] = [];
  const unconfirmed = (now: number) => {
    sent = sent.filter((move) => now - move.at < UNCONFIRMED_MS);
    return sent;
  };
  return {
    sent(dx: number, dy: number, now: number) {
      const length = Math.hypot(dx, dy);
      if (length)
        sent.push({
          x: (dx / length) * STEP,
          y: (dy / length) * STEP,
          at: now,
        });
    },
    confirmed() {
      sent.shift();
    },
    reset() {
      sent = [];
    },
    /** True once the server has answered, so its position is exact again. */
    settled: (now: number) => unconfirmed(now).length === 0,
    predict: (server: Point, now: number): Point =>
      unconfirmed(now).reduce(
        (at, move) => ({ x: at.x + move.x, y: at.y + move.y }),
        { x: server.x, y: server.y },
      ),
  };
}

/**
 * Drops waypoints already reached. The last one also waits for the server, so a
 * dropped move cannot leave the player short of where they tapped.
 */
export function advanceRoute(route: Point[], at: Point, settled: boolean) {
  let next = route;
  while (
    next.length &&
    Math.hypot(at.x - next[0].x, at.y - next[0].y) <= ARRIVED &&
    (next.length > 1 || settled)
  )
    next = next.slice(1);
  return next;
}

export const nearWaypoint = (at: Point, waypoint: Point) =>
  Math.hypot(at.x - waypoint.x, at.y - waypoint.y) <= ARRIVED;
