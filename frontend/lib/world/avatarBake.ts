import atlas from "./avatar-frames.json";
import type { Appearance } from "./types";

export const HAIR_COLORS = { espresso: "#342923", copper: "#a85d35" };
export const OUTFIT_COLORS = {
  original: "#fff",
  mint: "#8dba9c",
  sky: "#91b9d3",
  rose: "#d698a9",
};

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  footY: number;
  topY: number;
  bodyHeight: number;
};
export type SheetKind = "idle" | "walk" | "actions";
export type Sheet = { url: string; columns: number; rows: number };

const CELL = 200; // Pixels per frame: an 80px avatar on the sharpest phones.
const COLUMNS = 4;
const RETRY_MS = 5_000;

const hexToRgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không tải được ${src}`));
    image.src = src;
  });
}
function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draws a frame once with its hair and outfit colors applied. Doing this with SVG
 * filters and masks recomputed a 1280px image on every paint, which phones cannot afford.
 */
function drawFrame(
  target: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: Frame,
  size: number,
  appearance: Appearance,
  left: number,
  top: number,
) {
  const scale = CELL / size;
  const originX = frame.centerX - size / 2;
  const originY = frame.footY - size * 0.9375;
  const cell = canvasOf(CELL, CELL);
  const context = cell.getContext("2d", { willReadFrequently: true })!;
  const place = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.width, frame.height);
    ctx.clip();
  };
  context.save();
  place(context);
  context.drawImage(image, 0, 0);
  context.restore();
  if (appearance.hair !== "original") {
    // Darker pixels of the head are hair; skin stays untouched.
    const [r, g, b] = hexToRgb(HAIR_COLORS[appearance.hair]);
    const pixels = context.getImageData(0, 0, CELL, CELL);
    const startY = Math.max(0, Math.floor((frame.topY - originY) * scale));
    const endY = Math.min(
      CELL,
      Math.ceil((frame.topY + frame.bodyHeight * 0.58 - originY) * scale),
    );
    for (let y = startY; y < endY; y++)
      for (let x = 0; x < CELL; x++) {
        const i = (y * CELL + x) * 4;
        const alpha = pixels.data[i + 3] / 255;
        if (!alpha) continue;
        const mask =
          Math.min(1, Math.max(0, 2.05 - (4 * pixels.data[i]) / 255)) * 0.85;
        pixels.data[i] += (r - pixels.data[i]) * mask;
        pixels.data[i + 1] += (g - pixels.data[i + 1]) * mask;
        pixels.data[i + 2] += (b - pixels.data[i + 2]) * mask;
      }
    context.putImageData(pixels, 0, 0);
  }
  if (appearance.outfit !== "original") {
    const shirt = canvasOf(CELL, CELL);
    const paint = shirt.getContext("2d")!;
    paint.save();
    place(paint);
    paint.fillStyle = OUTFIT_COLORS[appearance.outfit];
    paint.fillRect(
      frame.centerX - frame.width * 0.19,
      frame.topY + frame.bodyHeight * 0.61,
      frame.width * 0.38,
      frame.bodyHeight * 0.17,
    );
    paint.restore();
    paint.globalCompositeOperation = "destination-in";
    paint.drawImage(cell, 0, 0);
    context.globalCompositeOperation = "color";
    context.drawImage(shirt, 0, 0);
    context.globalCompositeOperation = "source-over";
    shirt.width = 0;
  }
  target.drawImage(cell, left, top);
  // iOS caps total canvas memory, so scratch canvases are released straight away.
  cell.width = 0;
}

async function bake(appearance: Appearance, kind: SheetKind): Promise<Sheet> {
  const file = `avatar-${appearance.character}${kind === "walk" ? "-walk" : kind === "actions" ? "-actions" : ""}`;
  const frames = (atlas as Record<string, Frame[]>)[file];
  const image = await load(`/z4world/assets/${file}.webp`);
  const standing = kind === "actions" ? frames.slice(4) : frames;
  const body =
    standing.reduce((sum, item) => sum + item.bodyHeight, 0) / standing.length;
  const rows = Math.ceil(frames.length / COLUMNS);
  const sheet = canvasOf(COLUMNS * CELL, rows * CELL);
  const context = sheet.getContext("2d")!;
  frames.forEach((frame, index) =>
    drawFrame(
      context,
      image,
      frame,
      body / 0.84,
      appearance,
      (index % COLUMNS) * CELL,
      Math.floor(index / COLUMNS) * CELL,
    ),
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    sheet.toBlob(resolve, "image/webp", 0.9),
  );
  sheet.width = 0;
  if (!blob) throw new Error("Không tạo được ảnh nhân vật");
  return { url: URL.createObjectURL(blob), columns: COLUMNS, rows };
}

type Entry = { sheet: Sheet | null; ready: Promise<void>; failedAt: number };
const sheets = new Map<string, Entry>();
/** The sheet if it is ready; otherwise starts baking and reports when it can be asked again. */
export function getSheet(
  appearance: Appearance,
  kind: SheetKind,
): { sheet: Sheet | null; ready: Promise<void> } {
  const key = `${appearance.character}|${appearance.hair}|${appearance.outfit}|${kind}`;
  const existing = sheets.get(key);
  if (existing && (!existing.failedAt || Date.now() - existing.failedAt < RETRY_MS))
    return existing;
  const entry: Entry = { sheet: null, failedAt: 0, ready: Promise.resolve() };
  entry.ready = bake(appearance, kind)
    .then((sheet) => {
      entry.sheet = sheet;
    })
    .catch(() => {
      entry.failedAt = Date.now();
    });
  sheets.set(key, entry);
  return entry;
}
