"use client";

import { memo } from "react";
import { streetLamps } from "@/lib/world/assets";
import { groundPolygon, project } from "@/lib/world/projection";
import styles from "./world-scene.module.css";

const seeded = (n: number) => {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
};
const toPath = (points: [number, number][]) =>
  `M${points.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join("L")}Z`;

/**
 * Surrounding city as a handful of merged paths: the camera repaints the whole
 * SVG as it moves, so hundreds of separate nodes would hurt on phones.
 */
function buildCity() {
  const tops: string[] = [],
    lefts: string[] = [],
    rights: string[] = [],
    lit: string[] = [],
    accent: string[] = [];
  const blocks: {
    x: number;
    y: number;
    size: number;
    height: number;
    id: number;
  }[] = [];
  for (let gx = -4; gx <= 9; gx++)
    for (let gy = -4; gy <= 8; gy++) {
      const id = (gx + 7) * 31 + gy + 7;
      const size = 105 + seeded(id) * 50;
      const x = gx * 200 + 22,
        y = gy * 200 + 22;
      // Leave a clear street around the map.
      if (x + size > -70 && x < 1070 && y + size > -70 && y < 770) continue;
      if (seeded(id + 0.5) < 0.12) continue;
      const behind = x + size <= 0 || y + size <= 0;
      const height = behind
        ? 45 + seeded(id + 1) * 85
        : 16 + seeded(id + 1) * 26;
      blocks.push({ x, y, size, height, id });
    }
  blocks.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const { x, y, size, height, id } of blocks) {
    const at = (px: number, py: number, up = 0): [number, number] => {
      const p = project(px, py);
      return [p.x, p.y - up];
    };
    tops.push(
      toPath([
        at(x, y, height),
        at(x + size, y, height),
        at(x + size, y + size, height),
        at(x, y + size, height),
      ]),
    );
    lefts.push(
      toPath([
        at(x, y + size, height),
        at(x + size, y + size, height),
        at(x + size, y + size),
        at(x, y + size),
      ]),
    );
    rights.push(
      toPath([
        at(x + size, y, height),
        at(x + size, y + size, height),
        at(x + size, y + size),
        at(x + size, y),
      ]),
    );
    const rows = Math.floor(height / 24);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < 4; col++) {
        const pick = seeded(id * 3 + row * 7 + col);
        if (pick > 0.3) continue;
        const up = 14 + row * 24;
        const start = (size * (col + 0.3)) / 4,
          end = start + size * 0.12;
        const pane = toPath([
          at(x + start, y + size, up + 11),
          at(x + end, y + size, up + 11),
          at(x + end, y + size, up),
          at(x + start, y + size, up),
        ]);
        (pick < 0.025 ? accent : lit).push(pane);
      }
  }
  return {
    tops: tops.join(""),
    lefts: lefts.join(""),
    rights: rights.join(""),
    lit: lit.join(""),
    accent: accent.join(""),
  };
}
const city = buildCity();
const fireflies = [
  { x: 120, y: 620, delay: 0 },
  { x: 250, y: 590, delay: 1.3 },
  { x: 460, y: 620, delay: 2.1 },
  { x: 760, y: 590, delay: 0.7 },
  { x: 890, y: 640, delay: 3.2 },
  { x: 880, y: 330, delay: 1.9 },
  { x: 60, y: 420, delay: 2.7 },
];

/** Everything under the players. Memoized: it never changes after first paint. */
const WorldBackdrop = memo(function WorldBackdrop({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-warm`}>
          <stop stopColor="#ffbe74" stopOpacity=".42" />
          <stop offset=".55" stopColor="#ffbe74" stopOpacity=".12" />
          <stop offset="1" stopColor="#ffbe74" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-blue`}>
          <stop stopColor="#3b82f6" stopOpacity=".34" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <pattern
          id={`${uid}-grass`}
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <rect width="48" height="48" fill="#1b2420" />
          <path
            d="m9 12 2-3 2 3m22 22 2-3 2 3"
            fill="none"
            stroke="#25322b"
            strokeWidth="1.6"
          />
        </pattern>
        <pattern
          id={`${uid}-paving`}
          width="42"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <rect width="42" height="28" fill="#2c2c2e" />
          <path
            d="M0 0h42v28H0zm21 0v28"
            fill="none"
            stroke="#232325"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      {/* Oversized so tall or wide screens never reveal an edge around the map. */}
      <rect x="-4000" y="-4000" width="9760" height="9060" fill="#101010" />
      <path d={city.tops} fill="#1f1f1f" />
      <path d={city.lefts} fill="#171717" />
      <path d={city.rights} fill="#131313" />
      <path d={city.lit} fill="#d9a55f" opacity=".55" />
      <path d={city.accent} fill="#3b82f6" opacity=".75" />
      <polygon
        points={groundPolygon(0, 0, 1000, 700)}
        transform="translate(0 14)"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <g transform="matrix(.8 .4 -.8 .4 760 220)">
        <rect
          width="1000"
          height="700"
          rx="12"
          fill={`url(#${uid}-grass)`}
          stroke="#303030"
          strokeWidth="8"
        />
        <path
          d="M0 230H1000V285H0ZM320 0H390V700H320ZM610 0H675V700H610ZM0 560H1000V625H0Z"
          fill={`url(#${uid}-paving)`}
        />
        <rect
          x="300"
          y="275"
          width="400"
          height="230"
          rx="95"
          fill={`url(#${uid}-paving)`}
          stroke="#3a3a3d"
          strokeWidth="6"
        />
        <rect
          x="85"
          y="220"
          width="205"
          height="240"
          rx="24"
          fill="#2f2925"
          stroke="#40372f"
          strokeWidth="6"
        />
        <rect
          x="700"
          y="220"
          width="210"
          height="75"
          rx="10"
          fill="#1a2438"
          stroke="#3b82f6"
          strokeOpacity=".55"
          strokeWidth="3"
        />
      </g>
      {streetLamps.map((lamp) => {
        const p = project(lamp.x, lamp.y);
        return (
          <ellipse
            key={`${lamp.x}-${lamp.y}`}
            cx={p.x}
            cy={p.y}
            rx="150"
            ry="75"
            fill={`url(#${uid}-warm)`}
          />
        );
      })}
      {/* Light spilling from the doorways onto the pavement. */}
      <ellipse cx="770" cy="405" rx="170" ry="80" fill={`url(#${uid}-warm)`} />
      <ellipse cx="1240" cy="650" rx="170" ry="80" fill={`url(#${uid}-warm)`} />
      <ellipse cx="1198" cy="645" rx="130" ry="60" fill={`url(#${uid}-blue)`} />
      <g fill="#ffd98f">
        {fireflies.map((fly) => {
          const p = project(fly.x, fly.y);
          return (
            <circle
              key={`${fly.x}-${fly.y}`}
              cx={p.x}
              cy={p.y - 30}
              r="2"
              className={styles.firefly}
              style={{ animationDelay: `${fly.delay}s` }}
            />
          );
        })}
      </g>
    </>
  );
});

export default WorldBackdrop;
