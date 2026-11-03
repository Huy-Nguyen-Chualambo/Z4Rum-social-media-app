// Bakes the ground and surrounding city into two bitmaps: phones cannot afford to
// repaint this much vector art. Run after changing anything below.
const seeded = (n) => {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
};
const project = (x, y) => ({ x: 760 + (x - y) * 0.8, y: 220 + (x + y) * 0.4 });
const toPath = (points) =>
  `M${points.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join("L")}Z`;
const LAMPS = [
  { x: 320, y: 230 },
  { x: 675, y: 230 },
  { x: 320, y: 570 },
  { x: 675, y: 570 },
];
// The whole area a very tall or wide overview can show, and the map at full detail.
const CITY = { x: -320, y: -1200, width: 2400, height: 3400, scale: 0.5 };
const MAP = { x: 0, y: 100, width: 1760, height: 920, scale: 1.5 };

function buildCity() {
  const tops = [], lefts = [], rights = [], lit = [], accent = [], blocks = [];
  for (let gx = -9; gx <= 14; gx++)
    for (let gy = -9; gy <= 13; gy++) {
      const id = (gx + 12) * 31 + gy + 12;
      const size = 105 + seeded(id) * 50;
      const x = gx * 200 + 22, y = gy * 200 + 22;
      // Leave a clear street around the map.
      if (x + size > -70 && x < 1070 && y + size > -70 && y < 770) continue;
      if (seeded(id + 0.5) < 0.12) continue;
      const behind = x + size <= 0 || y + size <= 0;
      const height = behind ? 45 + seeded(id + 1) * 85 : 16 + seeded(id + 1) * 26;
      blocks.push({ x, y, size, height, id });
    }
  blocks.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const { x, y, size, height, id } of blocks) {
    const at = (px, py, up = 0) => {
      const p = project(px, py);
      return [p.x, p.y - up];
    };
    tops.push(toPath([at(x, y, height), at(x + size, y, height), at(x + size, y + size, height), at(x, y + size, height)]));
    lefts.push(toPath([at(x, y + size, height), at(x + size, y + size, height), at(x + size, y + size), at(x, y + size)]));
    rights.push(toPath([at(x + size, y, height), at(x + size, y + size, height), at(x + size, y + size), at(x + size, y)]));
    const rows = Math.floor(height / 24);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < 4; col++) {
        const pick = seeded(id * 3 + row * 7 + col);
        if (pick > 0.3) continue;
        const up = 14 + row * 24;
        const start = (size * (col + 0.3)) / 4, end = start + size * 0.12;
        const pane = toPath([at(x + start, y + size, up + 11), at(x + end, y + size, up + 11), at(x + end, y + size, up), at(x + start, y + size, up)]);
        (pick < 0.025 ? accent : lit).push(pane);
      }
  }
  return { tops: tops.join(""), lefts: lefts.join(""), rights: rights.join(""), lit: lit.join(""), accent: accent.join("") };
}
const city = buildCity();
const corners = [[0, 0], [1000, 0], [1000, 700], [0, 700]]
  .map(([x, y]) => { const p = project(x, y); return `${p.x},${p.y}`; })
  .join(" ");
const lamps = LAMPS.map((lamp) => {
  const p = project(lamp.x, lamp.y);
  return `<ellipse cx="${p.x}" cy="${p.y}" rx="150" ry="75" fill="url(#warm)"/>`;
}).join("");
const artwork = `
  <defs>
    <radialGradient id="warm"><stop stop-color="#ffbe74" stop-opacity=".42"/><stop offset=".55" stop-color="#ffbe74" stop-opacity=".12"/><stop offset="1" stop-color="#ffbe74" stop-opacity="0"/></radialGradient>
    <radialGradient id="blue"><stop stop-color="#3b82f6" stop-opacity=".34"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
    <pattern id="grass" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="#1b2420"/><path d="m9 12 2-3 2 3m22 22 2-3 2 3" fill="none" stroke="#25322b" stroke-width="1.6"/></pattern>
    <pattern id="paving" width="42" height="28" patternUnits="userSpaceOnUse"><rect width="42" height="28" fill="#2c2c2e"/><path d="M0 0h42v28H0zm21 0v28" fill="none" stroke="#232325" stroke-width="1"/></pattern>
  </defs>
  <rect x="-4000" y="-4000" width="9760" height="9060" fill="#101010"/>
  <path d="${city.tops}" fill="#1f1f1f"/>
  <path d="${city.lefts}" fill="#171717"/>
  <path d="${city.rights}" fill="#131313"/>
  <path d="${city.lit}" fill="#d9a55f" opacity=".55"/>
  <path d="${city.accent}" fill="#3b82f6" opacity=".75"/>
  <polygon points="${corners}" transform="translate(0 14)" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="10" stroke-linejoin="round"/>
  <g transform="matrix(.8 .4 -.8 .4 760 220)">
    <rect width="1000" height="700" rx="12" fill="url(#grass)" stroke="#303030" stroke-width="8"/>
    <path d="M0 230H1000V285H0ZM320 0H390V700H320ZM610 0H675V700H610ZM0 560H1000V625H0Z" fill="url(#paving)"/>
    <rect x="300" y="275" width="400" height="230" rx="95" fill="url(#paving)" stroke="#3a3a3d" stroke-width="6"/>
    <rect x="85" y="220" width="205" height="240" rx="24" fill="#2f2925" stroke="#40372f" stroke-width="6"/>
    <rect x="700" y="220" width="210" height="75" rx="10" fill="#1a2438" stroke="#3b82f6" stroke-opacity=".55" stroke-width="3"/>
  </g>
  ${lamps}
  <ellipse cx="770" cy="405" rx="170" ry="80" fill="url(#warm)"/>
  <ellipse cx="1240" cy="650" rx="170" ry="80" fill="url(#warm)"/>
  <ellipse cx="1198" cy="645" rx="130" ry="60" fill="url(#blue)"/>`;
(async () => {
  const path = await import("node:path");
  const { default: sharp } = await import("sharp");
  const out = path.resolve(__dirname, "../public/z4world/assets");
  for (const [name, area, quality] of [["ground-city", CITY, 70], ["ground-map", MAP, 82]]) {
    const width = Math.round(area.width * area.scale), height = Math.round(area.height * area.scale);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${area.x} ${area.y} ${area.width} ${area.height}">${artwork}</svg>`;
    const { size } = await sharp(Buffer.from(svg), { limitInputPixels: false })
      .webp({ quality, effort: 6 })
      .toFile(path.join(out, `${name}.webp`));
    console.log(`${name}: ${width}x${height}, ${size} bytes`);
  }
})();
