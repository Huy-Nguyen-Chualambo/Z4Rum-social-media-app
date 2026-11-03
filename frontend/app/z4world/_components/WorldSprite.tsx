"use client";
import { useEffect, useRef, useState } from "react";
import { getSheet, type SheetKind } from "@/lib/world/avatarBake";
import type { Appearance, Facing } from "@/lib/world/types";
import styles from "./world-scene.module.css";

export type SpriteAction = "idle" | "walk" | "sit" | "wave";
export type Pose = { facing: Facing; action: SpriteAction };
export type SpriteClock = Set<(time: number) => void>;

const FRAME_MS = 140;
const directions: Facing[] = [
  "front-left",
  "front-right",
  "back-left",
  "back-right",
];

/** One timer for every sprite. It writes to the DOM directly so React never re-renders. */
export function useSpriteClock(paused: boolean): SpriteClock {
  const [clock] = useState<SpriteClock>(() => new Set());
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const time = Date.now();
      for (const draw of clock) draw(time);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [clock, paused]);
  return clock;
}

const kindOf = (action: SpriteAction): SheetKind =>
  action === "walk" ? "walk" : action === "idle" ? "idle" : "actions";

export default function WorldSprite({
  appearance,
  pose,
  clock,
  still,
}: {
  appearance: Appearance;
  pose: (time: number) => Pose;
  clock: SpriteClock;
  still: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef({ pose, still });
  const redraw = useRef<(time: number) => void>(() => {});
  // Sitting down or changing clothes shows at once, not on the next animation frame.
  useEffect(() => {
    latest.current = { pose, still };
    redraw.current(Date.now());
  });
  const { character, hair, outfit } = appearance;
  useEffect(() => {
    const sprite = element.current;
    if (!sprite) return;
    const look: Appearance = { character, hair, outfit };
    let shown = "";
    let live = true;
    const draw = (time: number) => {
      const { facing, action } = latest.current.pose(time);
      const direction = directions.indexOf(facing);
      const index =
        action === "walk"
          ? direction * 4 +
            (latest.current.still ? 0 : Math.floor(time / FRAME_MS) % 4)
          : action === "wave"
            ? direction + 4
            : direction;
      const kind = kindOf(action);
      if (sprite.dataset.animation !== action)
        sprite.dataset.animation = action;
      if (sprite.dataset.frame !== String(index))
        sprite.dataset.frame = String(index);
      const parent = sprite.parentElement;
      if (parent && parent.dataset.facing !== facing)
        parent.dataset.facing = facing;
      const { sheet, ready } = getSheet(look, kind);
      if (!sheet) {
        // Keeps the last picture on screen rather than flashing an empty body.
        ready.then(() => {
          if (live) draw(Date.now());
        });
        return;
      }
      const key = `${sheet.url}:${index}`;
      if (key === shown) return;
      shown = key;
      sprite.style.backgroundImage = `url(${sheet.url})`;
      sprite.style.backgroundSize = `${sheet.columns * 100}% ${sheet.rows * 100}%`;
      sprite.style.backgroundPosition = `${((index % sheet.columns) / (sheet.columns - 1)) * 100}% ${
        sheet.rows > 1
          ? (Math.floor(index / sheet.columns) / (sheet.rows - 1)) * 100
          : 0
      }%`;
    };
    redraw.current = draw;
    draw(Date.now());
    // Baked ahead so the first step doesn't wait for it.
    getSheet(look, "walk");
    clock.add(draw);
    return () => {
      live = false;
      clock.delete(draw);
    };
  }, [character, hair, outfit, clock]);
  return (
    <div
      ref={element}
      className={styles.sprite}
      aria-hidden="true"
      data-character={character}
      data-hair={hair}
      data-outfit={outfit}
    />
  );
}
