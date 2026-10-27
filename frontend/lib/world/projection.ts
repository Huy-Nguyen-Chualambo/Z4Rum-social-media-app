/** Server coordinates stay Cartesian. Only presentation uses this projection. */
export const WORLD_VIEW = { width: 1760, height: 1060 };
export type Point = { x: number; y: number };
export function project(x: number, y: number): Point {
  return { x: 760 + (x - y) * 0.8, y: 220 + (x + y) * 0.4 };
}

export function screenDirection(dx: number, dy: number): Point {
  // Inverse of the projection's linear part: right means screen-right.
  const x = dx + dy * 2;
  const y = -dx + dy * 2;
  const scale = Math.max(1, Math.abs(x), Math.abs(y));
  return { x: x / scale, y: y / scale };
}

export function groundPolygon(x: number, y: number, w: number, h: number): string {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    .map(([px, py]) => { const p = project(px, py); return `${p.x},${p.y}`; }).join(' ');
}

export function cameraView(x: number, y: number, follow: boolean): string {
  if (!follow) return `0 0 ${WORLD_VIEW.width} ${WORLD_VIEW.height}`;
  const p = project(x, y);
  const width = 880, height = 620;
  return `${Math.max(0, Math.min(WORLD_VIEW.width - width, p.x - width / 2))} ${Math.max(0, Math.min(WORLD_VIEW.height - height, p.y - height * 0.6))} ${width} ${height}`;
}
