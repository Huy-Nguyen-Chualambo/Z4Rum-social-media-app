// Deterministic format/size derivatives only; original generated PNGs stay intact.
const specs = {
  cafe: 768,
  cinema: 768,
  fountain: 512,
  tree: 384,
  bench: 384,
  table: 256,
  chair: 256,
  lamp: 256,
  "avatar-peach": 1280,
  "avatar-lavender": 1280,
  "avatar-peach-walk": 1280,
  "avatar-lavender-walk": 1280,
  "avatar-peach-actions": 1280,
  "avatar-lavender-actions": 1280,
};
// Bump to regenerate. Scenery is graded for the site's dark theme; avatars stay
// natural so people remain the brightest thing in the scene.
const NIGHT_GRADE = "night-v1";
const isNight = (name) => !name.startsWith("avatar-");
function gradeNight(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    // Warm, bright pixels are windows and lanterns: they stay lit. Terracotta
    // roofs are warm too but have a much lower green channel, so they don't.
    const warmth = Math.min(1, Math.max(0, (r - b - 60) / 70));
    const bright = Math.min(1, Math.max(0, (g - 145) / 50));
    const lit = warmth * bright;
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    const dusk = [
      (r * 0.72 + luma * 0.28) * 0.48,
      (g * 0.72 + luma * 0.28) * 0.52,
      (b * 0.72 + luma * 0.28) * 0.74,
    ];
    data[i] = Math.min(255, dusk[0] + (r * 1.05 - dusk[0]) * lit);
    data[i + 1] = Math.min(255, dusk[1] + (g * 0.95 - dusk[1]) * lit);
    data[i + 2] = Math.min(255, dusk[2] + (b * 0.72 - dusk[2]) * lit);
  }
}
(async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const { default: sharp } = await import("sharp");
  const root = path.resolve(__dirname, "../..");
  const sourceDir = path.join(root, "docs/z4world/art/sources");
  const outputDir = path.join(root, "frontend/public/z4world/assets");
  fs.mkdirSync(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "manifest.json");
  const previous = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).assets
    : [];
  const manifest = [];
  const avatarFrames = {};
  for (const [name, size] of Object.entries(specs)) {
    const height = name.endsWith("-actions") ? size / 2 : size;
    const input = path.join(sourceDir, `${name}.png`);
    if (!fs.existsSync(input)) {
      console.log(`PENDING ${name}`);
      continue;
    }
    const metadata = await sharp(input).metadata();
    const stats = await sharp(input).stats();
    if (
      !metadata.hasAlpha ||
      stats.channels[3].min !== 0 ||
      stats.channels[3].max !== 255
    ) {
      throw new Error(`${name}: expected real transparent and opaque pixels`);
    }
    const sourceSha256 = crypto
      .createHash("sha256")
      .update(fs.readFileSync(input))
      .digest("hex");
    const runtimeName = isNight(name) ? `${name}-night` : name;
    const grade = isNight(name) ? NIGHT_GRADE : undefined;
    const output = path.join(outputDir, `${runtimeName}.webp`);
    if (
      !fs.existsSync(output) ||
      !previous.some(
        (p) =>
          p.name === name &&
          p.sourceSha256 === sourceSha256 &&
          p.grade === grade &&
          p.width === size &&
          p.height === height,
      )
    ) {
      const resized = sharp(input).resize(size, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (grade) {
        const { data, info } = await resized
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        gradeNight(data);
        await sharp(data, { raw: info })
          .webp({ quality: 87, alphaQuality: 100, effort: 6 })
          .toFile(output);
      } else {
        await resized
          .webp({ quality: 87, alphaQuality: 100, effort: 6 })
          .toFile(output);
      }
    }
    const bytes = fs.statSync(output).size;
    if (name.startsWith("avatar-")) {
      const { data, info } = await sharp(output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      avatarFrames[name] = [];
      const columns =
        name.endsWith("-walk") || name.endsWith("-actions") ? 4 : 2;
      const rows = name.endsWith("-walk") ? 4 : 2,
        cell = size / columns;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const cx = col * cell,
            cy = row * cell;
          // Measure the largest opaque connected silhouette, not a stray pixel
          // from the adjacent row. Do not alter the generated alpha/originals.
          const seen = new Uint8Array(cell * cell);
          let silhouette = [];
          const opaque = (n) =>
            data[
              ((cy + Math.floor(n / cell)) * info.width + cx + (n % cell)) * 4 +
                3
            ] > 220;
          for (let i = 0; i < seen.length; i++) {
            if (seen[i] || !opaque(i)) continue;
            const queue = [i];
            seen[i] = 1;
            for (let j = 0; j < queue.length; j++)
              for (const offset of [-cell, cell, -1, 1]) {
                const current = queue[j],
                  next = current + offset;
                if (
                  next < 0 ||
                  next >= seen.length ||
                  seen[next] ||
                  Math.abs((next % cell) - (current % cell)) > 1 ||
                  !opaque(next)
                )
                  continue;
                seen[next] = 1;
                queue.push(next);
              }
            if (queue.length > silhouette.length) silhouette = queue;
          }
          if (!silhouette.length)
            throw new Error(`Empty avatar frame: ${name} ${row}/${col}`);
          const ys = silhouette.map((n) => cy + Math.floor(n / cell));
          const footY = Math.max(...ys),
            topY = Math.min(...ys);
          // Ground anchor follows the feet, not a raised waving hand.
          let footMin = cx + cell,
            footMax = cx;
          for (const n of silhouette) {
            const x = cx + (n % cell),
              y = cy + Math.floor(n / cell);
            if (y >= footY - (footY - topY) * 0.12) {
              footMin = Math.min(footMin, x);
              footMax = Math.max(footMax, x);
            }
          }
          avatarFrames[name].push({
            x: cx,
            y: cy,
            width: cell,
            height: cell,
            centerX: (footMin + footMax) / 2,
            footY,
            topY,
            bodyHeight: footY - topY,
          });
        }
    }
    manifest.push({
      name,
      source: `docs/z4world/art/sources/${name}.png`,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      sourceSha256,
      runtime: `/z4world/assets/${runtimeName}.webp`,
      ...(grade ? { grade } : {}),
      width: size,
      height,
      bytes,
      transparent: true,
    });
    console.log(
      `${name}: ${metadata.width}×${metadata.height} -> ${size}×${height}, ${bytes} bytes`,
    );
  }
  const total = manifest.reduce((sum, item) => sum + item.bytes, 0);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generator: "Built-in image_gen; approved-study.png style reference",
        totalBytes: total,
        assets: manifest,
      },
      null,
      2,
    ) + "\n",
  );
  fs.writeFileSync(
    path.join(root, "frontend/lib/world/avatar-frames.json"),
    JSON.stringify(avatarFrames, null, 2) + "\n",
  );
  if (total > 3 * 1024 * 1024)
    throw new Error(`Runtime images exceed 3 MiB: ${total}`);
  console.log(`TOTAL: ${total} bytes`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
