/** Anchors refer to the center of each object's ground footprint, not its canvas. */
export const worldAssets = {
  cafe: { src: '/z4world/assets/cafe.webp', width: 350, height: 350, anchor: 0.84 },
  club: { src: '/z4world/assets/game-club.webp', width: 350, height: 350, anchor: 0.84 },
  fountain: { src: '/z4world/assets/fountain.webp', width: 190, height: 190, anchor: 0.82 },
  tree: { src: '/z4world/assets/tree.webp', width: 124, height: 150, anchor: 0.87 },
  bench: { src: '/z4world/assets/bench.webp', width: 118, height: 94, anchor: 0.8 },
  table: { src: '/z4world/assets/table.webp', width: 72, height: 86, anchor: 0.8 },
  chair: { src: '/z4world/assets/chair.webp', width: 49, height: 63, anchor: 0.82 },
  lamp: { src: '/z4world/assets/lamp.webp', width: 48, height: 117, anchor: 0.89 },
} as const;
export type Prop = { key: string; asset: keyof typeof worldAssets; x: number; y: number; scale?: number };
export const cafeTables = [{ id: 'cafe-1', x: 180, y: 300 }, { id: 'cafe-2', x: 180, y: 410 }];
export const props: Prop[] = [
  { key: 'cafe', asset: 'cafe', x: 195, y: 130 },
  { key: 'club', asset: 'club', x: 805, y: 130 },
  { key: 'fountain', asset: 'fountain', x: 500, y: 350 },
  { key: 'bench-left', asset: 'bench', x: 145, y: 495 },
  { key: 'bench-right', asset: 'bench', x: 815, y: 495 },
  ...cafeTables.flatMap(t => [
    { key: t.id, asset: 'table' as const, x: t.x, y: t.y },
    { key: `${t.id}-left`, asset: 'chair' as const, x: t.x-40, y: t.y },
    { key: `${t.id}-right`, asset: 'chair' as const, x: t.x+40, y: t.y },
  ]),
  ...[{ x: 50, y: 350 }, { x: 920, y: 340 }, { x: 240, y: 540 }, { x: 715, y: 600 }, { x: 50, y: 630 }, { x: 940, y: 630 }]
    .map((p, i) => ({ key: `tree-${i}`, asset: 'tree' as const, ...p, scale: i%2 ? 1 : 0.85 })),
  ...[{ x: 320, y: 230 }, { x: 675, y: 230 }, { x: 320, y: 570 }, { x: 675, y: 570 }]
    .map((p, i) => ({ key: `lamp-${i}`, asset: 'lamp' as const, ...p })),
];
