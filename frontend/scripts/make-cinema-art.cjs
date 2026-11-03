// Repaints the Game Club source art into the cinema, keeping the building's shape.
// Run before prepare-world-assets.cjs; the original PNG stays intact.
(async () => {
  const path = await import("node:path");
  const { default: sharp } = await import("sharp");
  const dir = path.resolve(__dirname, "../../docs/z4world/art/sources");
  const image = sharp(path.join(dir, "game-club.png")).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Purple walls and trim become cinema red; stone, plants and lights are untouched.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const purple = Math.min(1, Math.max(0, (Math.min(r, b) - g + 6) / 26));
    if (!purple || b < r * 0.9) continue;
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    data[i] = r + (Math.min(255, luma * 1.72) - r) * purple;
    data[i + 1] = g + (luma * 0.42 - g) * purple;
    data[i + 2] = b + (luma * 0.52 - b) * purple;
  }
  const s = info.width / 768; // Coordinates below were measured at 768px.
  const poster = (x, y, w, h, skew, fill) =>
    `<g transform="matrix(1 ${skew} 0 1 ${x} ${y})"><rect width="${w}" height="${h}" rx="2" fill="#2a1416"/><rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" fill="${fill}"/><rect x="${w * 0.2}" y="${h * 0.62}" width="${w * 0.6}" height="3" fill="#ffe9b0"/><circle cx="${w / 2}" cy="${h * 0.34}" r="${w * 0.2}" fill="#ffe9b0" opacity=".85"/></g>`;
  const at = (Math.round(232 * s) * info.width + Math.round(310 * s)) * 4;
  const wall = `rgb(${data[at]},${data[at + 1]},${data[at + 2]})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}" viewBox="0 0 768 768">
    <path d="M226 298 C226 232 268 212 312 212 C366 212 402 254 402 302 L402 340 L226 300 Z" fill="${wall}"/>
    <g transform="translate(314 268) rotate(12)">
      <circle r="40" fill="#f2d9a6"/><circle r="34" fill="#3a1216"/><circle r="8" fill="#f2d9a6"/>
      ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${Math.cos((a * Math.PI) / 180) * 21}" cy="${Math.sin((a * Math.PI) / 180) * 21}" r="7.5" fill="#f2d9a6"/>`).join("")}
    </g>
    <path d="M191 305 L440 362 L433 402 L190 349 Z" fill="#651a24" stroke="#f2d9a6" stroke-width="2.5" stroke-linejoin="round"/>
    <g transform="matrix(.975 .225 0 1 200 337)"><text x="118" y="0" text-anchor="middle" font-family="DejaVu Sans" font-weight="700" font-size="30" letter-spacing="1.5" fill="#fff3d0">RẠP PHIM</text></g>
    ${poster(236, 472, 45, 47, 0.2, "#b8323e")}
    ${poster(316, 494, 45, 47, 0.2, "#2f6fb5")}
    ${poster(405, 515, 46, 47, 0.2, "#c98a2b")}
    ${poster(570, 468, 38, 42, -0.42, "#b8323e")}
    ${poster(612, 487, 38, 42, -0.42, "#2f6fb5")}
  </svg>`;
  await sharp(data, { raw: info })
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .png()
    .toFile(path.join(dir, "cinema.png"));
})();
