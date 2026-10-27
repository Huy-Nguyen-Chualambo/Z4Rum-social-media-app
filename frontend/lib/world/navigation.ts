import type { Point } from "./projection";
export type Geometry = {
  width: number;
  height: number;
  blocks: { x: number; y: number; w: number; h: number }[];
  trunks: Point[];
};
export function unproject(x: number, y: number): Point {
  return {
    x: (x - 760) / 1.6 + (y - 220) / 0.8,
    y: (y - 220) / 0.8 - (x - 760) / 1.6,
  };
}
export function isWalkable(p: Point, g: Geometry) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 20 &&
    p.y >= 20 &&
    p.x <= g.width - 20 &&
    p.y <= g.height - 20 &&
    // Extra clearance covers the server's discrete 10-unit steps and the
    // waypoint arrival tolerance, so smoothing a corner cannot clip a solid.
    !g.blocks.some(
      (b) =>
        p.x > b.x - 24 &&
        p.x < b.x + b.w + 24 &&
        p.y > b.y - 24 &&
        p.y < b.y + b.h + 24,
    ) &&
    !g.trunks.some((t) => Math.hypot(p.x - t.x, p.y - t.y) < 35)
  );
}
function clearLine(a: Point, b: Point, g: Geometry) {
  const count = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 5);
  for (let i = 1; i <= count; i++)
    if (
      !isWalkable(
        {
          x: a.x + ((b.x - a.x) * i) / count,
          y: a.y + ((b.y - a.y) * i) / count,
        },
        g,
      )
    )
      return false;
  return true;
}
/** Bounded A*, including corner checks; routes still go through server movement. */
export function findPath(start: Point, target: Point, g: Geometry): Point[] {
  if (
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y) ||
    target.x < 0 ||
    target.y < 0 ||
    target.x > g.width ||
    target.y > g.height
  )
    return [];
  const cell = 20,
    columns = Math.floor((g.width - 40) / cell) + 1,
    rows = Math.floor((g.height - 40) / cell) + 1;
  const point = (id: number): Point => ({
    x: 20 + (id % columns) * cell,
    y: 20 + Math.floor(id / columns) * cell,
  });
  const nearest = (p: Point) => {
    let best = -1,
      score = Infinity;
    for (let id = 0; id < columns * rows; id++) {
      const q = point(id),
        d = Math.hypot(p.x - q.x, p.y - q.y);
      if (
        d < score &&
        d < 80 &&
        isWalkable(q, g) &&
        (p !== start || clearLine(p, q, g))
      ) {
        score = d;
        best = id;
      }
    }
    return best;
  };
  const first = nearest(start),
    last = nearest(target);
  if (first < 0 || last < 0) return [];
  const open = new Set([first]),
    closed = new Set<number>(),
    previous = new Map<number, number>(),
    scores = new Map([[first, 0]]);
  while (open.size && closed.size < 4000) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const a = point(id),
        b = point(last);
      const f = (scores.get(id) ?? Infinity) + Math.hypot(a.x - b.x, a.y - b.y);
      if (f < best) {
        best = f;
        current = id;
      }
    }
    if (current === last) {
      const ids = [last];
      while (previous.has(ids[0])) ids.unshift(previous.get(ids[0])!);
      const route = ids.map(point);
      if (
        isWalkable(target, g) &&
        clearLine(route[route.length - 1], target, g)
      )
        route.push(target);
      return route;
    }
    open.delete(current);
    closed.add(current);
    const col = current % columns,
      row = Math.floor(current / columns);
    for (const dx of [-1, 0, 1])
      for (const dy of [-1, 0, 1]) {
        if (
          (!dx && !dy) ||
          col + dx < 0 ||
          row + dy < 0 ||
          col + dx >= columns ||
          row + dy >= rows
        )
          continue;
        const next = current + dx + dy * columns;
        if (
          closed.has(next) ||
          !isWalkable(point(next), g) ||
          !clearLine(point(current), point(next), g)
        )
          continue;
        const cost = (scores.get(current) ?? 0) + Math.hypot(dx, dy) * cell;
        if (cost < (scores.get(next) ?? Infinity)) {
          previous.set(next, current);
          scores.set(next, cost);
          open.add(next);
        }
      }
  }
  return [];
}
