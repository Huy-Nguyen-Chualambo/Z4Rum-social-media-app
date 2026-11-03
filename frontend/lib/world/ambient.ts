import { facingFor, type Point } from "./projection";
import type { Appearance, Facing } from "./types";

/** Decorative passers-by, computed locally. They are not players or synced. */
export type AmbientWalker = {
  key: string;
  appearance: Appearance;
  route: Point[];
  offset: number;
};

const SPEED = 55; // World units per second; players move at about 160.

// Routes stay on the paved roads, clear of the server's collision shapes.
export const ambientWalkers: AmbientWalker[] = [
  {
    key: "ambient-plaza",
    appearance: { character: "lavender", hair: "copper", outfit: "sky" },
    route: [
      { x: 355, y: 258 },
      { x: 642, y: 258 },
      { x: 642, y: 592 },
      { x: 355, y: 592 },
    ],
    offset: 0,
  },
  {
    key: "ambient-avenue",
    appearance: { character: "peach", hair: "espresso", outfit: "mint" },
    route: [
      { x: 30, y: 222 },
      { x: 300, y: 222 },
    ],
    offset: 9_000,
  },
  {
    key: "ambient-park",
    appearance: { character: "peach", hair: "copper", outfit: "rose" },
    route: [
      { x: 40, y: 592 },
      { x: 295, y: 592 },
    ],
    offset: 4_000,
  },
];

/** Walks a closed loop; a two-point route simply goes back and forth. */
export function ambientPosition(
  walker: AmbientWalker,
  now: number,
): Point & { facing: Facing } {
  const { route } = walker;
  const legs = route.map((from, i) => {
    const to = route[(i + 1) % route.length];
    return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
  });
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  let distance = (((now + walker.offset) / 1000) * SPEED) % total;
  for (const leg of legs) {
    if (distance <= leg.length) {
      const t = distance / leg.length;
      return {
        x: leg.from.x + (leg.to.x - leg.from.x) * t,
        y: leg.from.y + (leg.to.y - leg.from.y) * t,
        facing: facingFor(leg.to.x - leg.from.x, leg.to.y - leg.from.y),
      };
    }
    distance -= leg.length;
  }
  return { ...route[0], facing: "front-left" };
}
