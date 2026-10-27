"use client";
import { useId, useSyncExternalStore } from "react";
import atlas from "@/lib/world/avatar-frames.json";
import type { Appearance, Facing } from "@/lib/world/types";
const directions: Facing[] = [
  "front-left",
  "front-right",
  "back-left",
  "back-right",
];
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
const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (change: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};
export default function AvatarSprite({
  appearance,
  facing = "front-left",
  action = "idle",
  now = 0,
}: {
  appearance: Appearance;
  facing?: Facing;
  action?: "idle" | "walk" | "sit" | "wave";
  now?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const direction = directions.indexOf(facing),
    walking = action === "walk",
    actions = action === "sit" || action === "wave";
  const file = `avatar-${appearance.character}${walking ? "-walk" : actions ? "-actions" : ""}`;
  const frames = (atlas as Record<string, Frame[]>)[file];
  const index = walking
    ? direction * 4 + (reduced ? 0 : Math.floor(now / 140) % 4)
    : actions
      ? direction + (action === "wave" ? 4 : 0)
      : direction;
  const f = frames[index];
  const standing = actions ? frames.slice(4) : frames;
  const body =
    standing.reduce((sum, item) => sum + item.bodyHeight, 0) / standing.length;
  const size = body / 0.84,
    sourceHeight = actions ? 640 : 1280;
  const hair = appearance.hair === "espresso" ? "#342923" : "#a85d35";
  const outfit = {
    original: "#fff",
    mint: "#8dba9c",
    sky: "#91b9d3",
    rose: "#d698a9",
  }[appearance.outfit];
  const image = (
    <image
      href={`/z4world/assets/${file}.webp`}
      width="1280"
      height={sourceHeight}
    />
  );
  return (
    <svg
      x="-40"
      y="-75"
      width="80"
      height="80"
      viewBox={`${f.centerX - size / 2} ${f.footY - size * 0.9375} ${size} ${size}`}
      overflow="hidden"
      aria-hidden="true"
      data-animation={action}
      data-frame={index}
      data-character={appearance.character}
      data-hair={appearance.hair}
      data-outfit={appearance.outfit}
    >
      <defs>
        <clipPath id={`${uid}-cell`}>
          <rect x={f.x} y={f.y} width={f.width} height={f.height} />
        </clipPath>
        {/* Select darker hair pixels, then constrain to the head: skin stays untouched. */}
        <filter id={`${uid}-dark`} colorInterpolationFilters="sRGB">
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -4 0 0 0 2.05" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <mask
          id={`${uid}-hair`}
          maskUnits="userSpaceOnUse"
          x={f.x}
          y={f.y}
          width={f.width}
          height={f.height}
        >
          <g filter={`url(#${uid}-dark)`}>{image}</g>
        </mask>
        <mask
          id={`${uid}-body`}
          maskUnits="userSpaceOnUse"
          x={f.x}
          y={f.y}
          width={f.width}
          height={f.height}
        >
          <image
            href={`/z4world/assets/${file}.webp`}
            width="1280"
            height={sourceHeight}
          />
        </mask>
      </defs>
      <g clipPath={`url(#${uid}-cell)`}>
        {image}
        {appearance.hair !== "original" && (
          <rect
            x={f.x}
            y={f.topY}
            width={f.width}
            height={f.bodyHeight * 0.58}
            fill={hair}
            opacity=".85"
            mask={`url(#${uid}-hair)`}
          />
        )}
        {appearance.outfit !== "original" && (
          <rect
            x={f.centerX - f.width * 0.19}
            y={f.topY + f.bodyHeight * 0.61}
            width={f.width * 0.38}
            height={f.bodyHeight * 0.17}
            rx={f.width * 0.025}
            fill={outfit}
            style={{ mixBlendMode: "color" }}
            mask={`url(#${uid}-body)`}
          />
        )}
      </g>
    </svg>
  );
}
