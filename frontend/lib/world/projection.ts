import type { Facing } from './types';

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

/** Ignores rounding noise so walking straight up or down doesn't flip the sprite. */
export function facingFor(dx: number, dy: number, previous?: Facing): Facing {
  const across = dx - dy, along = dx + dy;
  const right = Math.abs(across) < 1e-6 ? (previous?.endsWith('right') ?? true) : across > 0;
  const front = Math.abs(along) < 1e-6 ? (previous?.startsWith('front') ?? true) : along > 0;
  return `${front ? 'front' : 'back'}-${right ? 'right' : 'left'}`;
}

export type ViewSize = { width: number; height: number };
/** The part of the map that overview mode must always keep on screen. */
const OVERVIEW = { centerX: 880, centerY: 500, width: 1500, height: 920 };
const FOLLOW_AREA = 880 * 620;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fitAxis = (start: number, size: number, extent: number) =>
  size >= extent ? (extent - size) / 2 : clamp(start, 0, extent - size);

/** Returns a viewBox matching the screen's aspect ratio, so nothing is letterboxed. */
export function cameraView(x: number, y: number, follow: boolean, screen: ViewSize = WORLD_VIEW): string {
  const aspect = screen.width / screen.height;
  if (!follow) {
    const width = Math.max(OVERVIEW.width, OVERVIEW.height * aspect);
    const height = width / aspect;
    return [OVERVIEW.centerX - width / 2, OVERVIEW.centerY - height / 2, width, height].map(Math.round).join(' ');
  }
  // Keep avatars a similar physical size from phones to large monitors.
  const scale = clamp(Math.sqrt((screen.width * screen.height) / FOLLOW_AREA), 0.8, 1.4);
  const width = Math.round(screen.width / scale), height = Math.round(screen.height / scale);
  const p = project(x, y);
  return [
    Math.round(fitAxis(p.x - width / 2, width, WORLD_VIEW.width)),
    Math.round(fitAxis(p.y - height * 0.6, height, WORLD_VIEW.height)),
    width,
    height,
  ].join(' ');
}
