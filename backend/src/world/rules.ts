export const SIZE = { width: 1000, height: 700 };
export const TABLES = [{ id: 'cafe-1', x: 180, y: 300 }, { id: 'cafe-2', x: 180, y: 410 }];
export const TREE_TRUNKS = [{ x: 50, y: 350 }, { x: 920, y: 340 }, { x: 240, y: 540 }, { x: 715, y: 600 }, { x: 50, y: 630 }, { x: 940, y: 630 }];
export const BLOCKS = [
  { x: 80, y: 65, w: 230, h: 130 },
  { x: 690, y: 65, w: 230, h: 130 },
  { x: 440, y: 300, w: 120, h: 100 },
  { x: 100, y: 475, w: 90, h: 40 },
  { x: 770, y: 475, w: 90, h: 40 },
];
export function walkable(x: number, y: number) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 20 && y >= 20 && x <= 980 && y <= 680 &&
    !BLOCKS.some(b => x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 14 && y < b.y + b.h + 14) &&
    !TREE_TRUNKS.some(t => Math.hypot(x-t.x, y-t.y) < 25);
}
export function step(x: number, y: number, dx: number, dy: number) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x, y };
  const nx = x + dx / length * 10;
  const ny = y + dy / length * 10;
  const acceptedX = walkable(nx, y) ? nx : x;
  return { x: acceptedX, y: walkable(acceptedX, ny) ? ny : y };
}
const MOVE_INTERVAL = 45;
const MOVE_BURST = 4;
export const FULL_MOVE_CREDIT = MOVE_BURST;
/** Limits the average rate, not each gap: jitter bunches moves that were sent evenly. */
export function moveCredit(credit: number, elapsed: number) {
  return Math.min(MOVE_BURST, credit + elapsed / MOVE_INTERVAL);
}
/** The pavement in front of the cinema, where a screening can be started. */
export function atCinema(x: number, y: number) {
  return x >= 650 && y <= 300;
}
