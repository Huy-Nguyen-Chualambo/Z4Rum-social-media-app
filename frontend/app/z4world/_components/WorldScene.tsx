"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { ambientPosition, ambientWalkers } from "@/lib/world/ambient";
import { cafeTables, props, worldAssets } from "@/lib/world/assets";
import { cameraView, project } from "@/lib/world/projection";
import { useLowPower } from "@/lib/world/immersive";
import type {
  Appearance,
  Facing,
  Motion,
  WorldEmote,
  WorldMessage,
  WorldPlayer,
} from "@/lib/world/types";
import type { Point } from "@/lib/world/projection";
import { unproject } from "@/lib/world/navigation";
import WorldSprite, {
  useSpriteClock,
  type Pose,
  type SpriteClock,
} from "./WorldSprite";
import styles from "./world-scene.module.css";
const subscribeReduced = (change: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};

/** The one thing the player can do right now, always just below their name. */
export type SceneAction = { label: string; run: () => void };
// Bubbles wrap instead of truncating; the server caps messages at 200 characters.
function wrapBubble(text: string, width = 30, maxLines = 4) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    let rest = word;
    while (rest.length > width) {
      if (line) lines.push(line);
      line = "";
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (line && line.length + rest.length + 1 > width) {
      lines.push(line);
      line = rest;
    } else line = line ? `${line} ${rest}` : rest;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, width - 1)}…`;
  return kept;
}

type SceneProps = {
  players: Record<string, WorldPlayer>;
  self: string;
  messages: WorldMessage[];
  emotes: Record<string, WorldEmote>;
  motions: RefObject<Record<string, Motion>>;
  paused: boolean;
  follow: boolean;
  onDestination: (point: Point) => void;
  onInteract: (id: string) => void;
  destination: Point | null;
  action: SceneAction | null;
  showKeyHint: boolean;
};

const BUBBLE_MS = 5000;
const AMBIENT_MS = 500;
const LABEL_Z = 5000;
const translate = ({ x, y }: Point) => `translate3d(${x}px,${y}px,0)`;
const fireflies = [
  { x: 120, y: 620, delay: 0 },
  { x: 250, y: 590, delay: 1.3 },
  { x: 460, y: 620, delay: 2.1 },
  { x: 760, y: 590, delay: 0.7 },
  { x: 890, y: 640, delay: 3.2 },
  { x: 880, y: 330, delay: 1.9 },
  { x: 60, y: 420, delay: 2.7 },
];

/** Baked bitmaps from scripts/make-ground-art.cjs: painted once, never again. */
const Ground = memo(function Ground({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/z4world/assets/ground-city.webp"
        alt=""
        className={styles.ground}
        style={{ left: -320, top: -1200, width: 2400, height: 3400 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/z4world/assets/ground-map.webp"
        alt=""
        className={styles.ground}
        style={{ left: 0, top: 100, width: 1760, height: 920 }}
      />
      {!lowPower &&
        fireflies.map((fly) => {
          const p = project(fly.x, fly.y);
          return (
            <i
              key={`${fly.x}-${fly.y}`}
              className={styles.firefly}
              style={{
                left: p.x,
                top: p.y - 30,
                animationDelay: `${fly.delay}s`,
              }}
            />
          );
        })}
    </>
  );
});

const Props = memo(function Props({
  occluded,
  lowPower,
  onInteract,
}: {
  occluded: string;
  lowPower: boolean;
  onInteract: (id: string) => void;
}) {
  const faded = occluded.split(" ");
  return (
    <>
      {props.map((prop) => {
        const asset = worldAssets[prop.asset],
          p = project(prop.x, prop.y),
          w = asset.width * (prop.scale ?? 1),
          h = asset.height * (prop.scale ?? 1);
        const interactive =
          prop.key === "cinema" ||
          prop.key === "cafe" ||
          cafeTables.some((t) => t.id === prop.key);
        return (
          <div
            key={prop.key}
            className={`${styles.prop} ${interactive ? styles.interactive : ""}`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? prop.key === "cinema"
                  ? "Vào rạp phim"
                  : prop.key === "cafe"
                    ? "Đến quán cà phê"
                    : `Ngồi ${prop.key}`
                : undefined
            }
            style={{
              left: p.x - w / 2,
              top: p.y - h * asset.anchor,
              width: w,
              height: h,
              zIndex: Math.round(prop.x + prop.y),
              opacity: faded.includes(prop.key) ? 0.35 : undefined,
            }}
            onClick={
              interactive
                ? (event) => {
                    event.stopPropagation();
                    onInteract(prop.key);
                  }
                : undefined
            }
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onInteract(prop.key);
                    }
                  }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-prop={prop.key} src={asset.src} alt="" />
            {prop.asset === "fountain" && !lowPower && (
              <i
                className={styles.ripple}
                style={{
                  left: w / 2 - 37,
                  top: h * asset.anchor - 39 - 11,
                  width: 74,
                  height: 22,
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
});

const defaultAppearance = (player: WorldPlayer): Appearance =>
  player.appearance ?? {
    character:
      [...player.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 2
        ? "lavender"
        : "peach",
    hair: "original",
    outfit: "original",
  };

/** Moves itself twice a second; the compositor glides between the points. */
function AmbientWalker({
  walker,
  clock,
  paused,
  still,
}: {
  walker: (typeof ambientWalkers)[number];
  clock: SpriteClock;
  paused: boolean;
  still: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const facing = useRef<Facing>("front-left");
  useEffect(() => {
    const place = () => {
      const position = ambientPosition(walker, still ? 0 : Date.now());
      facing.current = position.facing;
      if (!element.current) return;
      element.current.style.transform = translate(
        project(position.x, position.y),
      );
      element.current.style.zIndex = String(
        Math.round(position.x + position.y),
      );
    };
    place();
    if (paused || still) return;
    const timer = setInterval(() => {
      if (!document.hidden) place();
    }, AMBIENT_MS);
    return () => clearInterval(timer);
  }, [walker, paused, still]);
  return (
    <div
      ref={element}
      data-ambient={walker.key}
      className={`${styles.actor} ${styles.ambient}`}
    >
      <div className={styles.shadow} />
      <WorldSprite
        appearance={walker.appearance}
        clock={clock}
        still={still}
        pose={() => ({
          facing: facing.current,
          action: still ? "idle" : "walk",
        })}
      />
    </div>
  );
}

export default function WorldScene({
  players,
  self,
  messages,
  emotes,
  motions,
  paused,
  follow,
  onDestination,
  onInteract,
  destination,
  action,
  showKeyHint,
}: SceneProps) {
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const lowPower = useLowPower();
  const clock = useSpriteClock(paused);
  const me = players[self];
  const local = me ? project(me.x, me.y) : null;
  const viewport = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState({ width: 16, height: 9 });
  const [smooth, setSmooth] = useState(false);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) {
        setScreen({ width, height });
        // The first placement must not glide in from nowhere.
        requestAnimationFrame(() => setSmooth(true));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const view = cameraView(
    me?.x ?? 500,
    me?.y ?? 350,
    follow && Boolean(me),
    screen,
  );
  const [viewX, viewY, viewWidth] = view.split(" ").map(Number);
  const zoom = screen.width / viewWidth;

  // Bubbles and emotes expire on a timer only while there are any: idle means no renders.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const time = Date.now();
    const ends = [
      ...messages.map((m) => m.at + BUBBLE_MS),
      ...Object.values(emotes).map((e) => e.until),
    ].filter((end) => end > time);
    if (!ends.length) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(...ends) - time + 20,
    );
    return () => clearTimeout(timer);
  }, [messages, emotes, now]);

  const latest = useRef(onInteract);
  useEffect(() => {
    latest.current = onInteract;
  });
  const [interact] = useState(() => (id: string) => latest.current(id));
  const poseOf =
    (id: string) =>
    (time: number): Pose => {
      const player = players[id];
      const motion = motions.current[id];
      const emote = emotes[id];
      if (player?.table)
        return {
          facing: (player.facing as Facing) ?? "front-left",
          action: "sit",
        };
      if (motion && motion.until > time)
        return { facing: motion.facing, action: "walk" };
      const waving =
        emote?.text === "👋" &&
        emote.until > time &&
        (reduced || Math.floor(time / 300) % 2);
      return {
        facing: motion?.facing ?? "front-left",
        action: waving ? "wave" : "idle",
      };
    };

  // Scenery that stands in front of the player fades so they stay visible.
  const occluded =
    me && local
      ? props
          .filter((prop) => {
            const asset = worldAssets[prop.asset],
              p = project(prop.x, prop.y),
              w = asset.width * (prop.scale ?? 1),
              h = asset.height * (prop.scale ?? 1);
            return (
              me.x + me.y < prop.x + prop.y &&
              local.x > p.x - w * 0.44 &&
              local.x < p.x + w * 0.44 &&
              local.y > p.y - h * asset.anchor &&
              local.y < p.y + 10
            );
          })
          .map((prop) => prop.key)
          .join(" ")
      : "";
  const mark = destination && project(destination.x, destination.y);

  return (
    <figure className={`${styles.frame} ${paused ? styles.paused : ""}`}>
      <div
        ref={viewport}
        data-testid="world-scene"
        data-view={view}
        className={styles.scene}
        role="group"
        aria-label="Z4world isometric: quán cà phê, rạp phim và quảng trường với người chơi realtime"
        onClick={(event) => {
          const element = camera.current;
          if (!element) return;
          // Reads the camera mid-glide, so a tap lands where it looks like it lands.
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          const box = event.currentTarget.getBoundingClientRect();
          onDestination(
            unproject(
              (event.clientX - box.left - matrix.e) / matrix.a,
              (event.clientY - box.top - matrix.f) / matrix.d,
            ),
          );
        }}
      >
        <div
          ref={camera}
          className={`${styles.camera} ${smooth && !reduced ? styles.smooth : ""}`}
          style={{
            transform: `translate3d(${-viewX * zoom}px,${-viewY * zoom}px,0) scale(${zoom})`,
          }}
        >
          <Ground lowPower={lowPower} />
          {mark && (
            <div
              className={styles.destination}
              style={{ transform: translate(mark), zIndex: 1 }}
            >
              <div className={styles.destinationMark} />
            </div>
          )}
          <Props occluded={occluded} lowPower={lowPower} onInteract={interact} />
          {!lowPower &&
            ambientWalkers.map((walker) => (
              <AmbientWalker
                key={walker.key}
                walker={walker}
                clock={clock}
                paused={paused}
                still={reduced}
              />
            ))}
          {Object.entries(players).map(([id, player]) => (
            <div
              key={id}
              data-player={id}
              data-x={player.x}
              data-y={player.y}
              data-username={player.username}
              className={styles.actor}
              style={{
                transform: translate(project(player.x, player.y)),
                zIndex: Math.round(player.x + player.y),
              }}
            >
              <div className={styles.shadow} />
              {id === self && <div className={styles.ring} />}
              <WorldSprite
                appearance={defaultAppearance(player)}
                clock={clock}
                still={reduced}
                pose={poseOf(id)}
              />
            </div>
          ))}
          {/* Names and bubbles sit above the depth-sorted scenery for readability. */}
          {Object.entries(players).map(([id, player]) => {
            const bubble = [...messages]
              .reverse()
              .find((m) => m.from === id && now - m.at < BUBBLE_MS);
            const emoji = emotes[id]?.until > now ? emotes[id].text : "";
            return (
              <div
                key={id}
                className={styles.label}
                style={{ transform: translate(project(player.x, player.y)) }}
              >
                <div
                  className={`${styles.nameTag} ${id === self ? styles.nameTagSelf : ""}`}
                >
                  <i
                    className={styles.nameDot}
                    style={{ background: player.color }}
                  />
                  {player.username.slice(0, 12)}
                  {id === self ? " · bạn" : ""}
                </div>
                {emoji && <div className={styles.emote}>{emoji}</div>}
                {bubble && (
                  <div className={styles.bubble}>
                    {wrapBubble(
                      `${bubble.scope === "table" ? "☕ " : ""}${bubble.text}`,
                    ).map((line, i) => (
                      <span key={i} data-bubble-line>
                        {line}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {action && local && (
            <div
              className={styles.label}
              style={{ transform: translate(local), zIndex: LABEL_Z + 1 }}
            >
              <button
                aria-label={action.label}
                className={styles.actionPill}
                onClick={(event) => {
                  event.stopPropagation();
                  action.run();
                }}
              >
                {showKeyHint && <span className={styles.actionKey}>E</span>}
                {action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
