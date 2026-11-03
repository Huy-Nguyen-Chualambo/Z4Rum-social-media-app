"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ambientPosition, ambientWalkers } from "@/lib/world/ambient";
import { cafeTables, props, worldAssets } from "@/lib/world/assets";
import { cameraView, project } from "@/lib/world/projection";
import type {
  Motion,
  WorldEmote,
  WorldMessage,
  WorldPlayer,
} from "@/lib/world/types";
import type { Point } from "@/lib/world/projection";
import { unproject } from "@/lib/world/navigation";
import AvatarSprite from "./AvatarSprite";
import WorldBackdrop from "./WorldBackdrop";
import styles from "./world-scene.module.css";
const subscribeReduced = (change: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};

/** The one thing the player can do right now, always just below their name. */
export type SceneAction = { label: string; run: () => void };
const MONO = '"SFMono-Regular", Consolas, monospace';
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
  motions: Record<string, Motion>;
  now: number;
  follow: boolean;
  onDestination: (point: Point) => void;
  onInteract: (id: string) => void;
  destination: Point | null;
  action: SceneAction | null;
  showKeyHint: boolean;
};

export default function WorldScene({
  players,
  self,
  messages,
  emotes,
  motions,
  now,
  follow,
  onDestination,
  onInteract,
  destination,
  action,
  showKeyHint,
}: SceneProps) {
  const uid = useId().replace(/:/g, "");
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const me = players[self];
  const local = me ? project(me.x, me.y) : null;
  const viewport = useRef<SVGSVGElement>(null);
  const [screen, setScreen] = useState({ width: 16, height: 9 });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setScreen({ width, height });
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
  const currentView = useRef([0, 0, 1760, 1060]);
  useEffect(() => {
    const target = view.split(" ").map(Number);
    let frame = 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = () => {
      const done =
        reduced ||
        currentView.current.every((n, i) => Math.abs(n - target[i]) < 0.2);
      currentView.current = done
        ? target
        : currentView.current.map((n, i) => n + (target[i] - n) * 0.22);
      viewport.current?.setAttribute("viewBox", currentView.current.join(" "));
      if (!done) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [view]);
  const ordered = [
    ...props.map((p) => ({
      kind: "prop" as const,
      key: p.key,
      depth: p.x + p.y,
      prop: p,
    })),
    ...Object.entries(players).map(([id, player]) => ({
      kind: "player" as const,
      key: id,
      depth: player.x + player.y,
      player,
    })),
    ...ambientWalkers.map((walker) => {
      const position = ambientPosition(walker, reduced ? 0 : now);
      return {
        kind: "ambient" as const,
        key: walker.key,
        depth: position.x + position.y,
        walker,
        position,
      };
    }),
  ].sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));

  return (
    <figure className={styles.frame}>
      <svg
        ref={viewport}
        data-testid="world-scene"
        viewBox="0 0 1760 1060"
        className={styles.scene}
        role="group"
        aria-label="Z4world isometric: quán cà phê, rạp phim và quảng trường với người chơi realtime"
        onClick={(event) => {
          const matrix = event.currentTarget.getScreenCTM();
          if (!matrix) return;
          const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
            matrix.inverse(),
          );
          onDestination(unproject(p.x, p.y));
        }}
      >
        <WorldBackdrop uid={uid} />
        {destination && (
          <g
            pointerEvents="none"
            transform={`translate(${project(destination.x, destination.y).x},${project(destination.x, destination.y).y})`}
          >
            <ellipse
              rx="14"
              ry="7"
              fill="#3b82f6"
              fillOpacity=".25"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          </g>
        )}
        {ordered.map((item) => {
          if (item.kind === "ambient") {
            const p = project(item.position.x, item.position.y);
            return (
              <g
                key={item.key}
                data-ambient={item.key}
                pointerEvents="none"
                opacity=".88"
                style={{
                  transform: `translate(${p.x}px,${p.y}px)`,
                  transition: reduced ? undefined : "transform 100ms linear",
                }}
              >
                <ellipse cy="2" rx="13" ry="6" fill="#000" opacity=".35" />
                <AvatarSprite
                  appearance={item.walker.appearance}
                  facing={item.position.facing}
                  action={reduced ? "idle" : "walk"}
                  now={now}
                />
              </g>
            );
          }
          if (item.kind === "prop") {
            const prop = item.prop,
              asset = worldAssets[prop.asset],
              p = project(prop.x, prop.y);
            const w = asset.width * (prop.scale ?? 1),
              h = asset.height * (prop.scale ?? 1);
            const occluded =
              local &&
              me &&
              me.x + me.y < item.depth &&
              local.x > p.x - w * 0.44 &&
              local.x < p.x + w * 0.44 &&
              local.y > p.y - h * asset.anchor &&
              local.y < p.y + 10;
            const interactive =
              prop.key === "cinema" ||
              prop.key === "cafe" ||
              cafeTables.some((t) => t.id === prop.key);
            return (
              <g
                key={item.key}
                opacity={occluded ? 0.35 : 1}
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
                <image
                  data-prop={item.key}
                  href={asset.src}
                  x={p.x - w / 2}
                  y={p.y - h * asset.anchor}
                  width={w}
                  height={h}
                  preserveAspectRatio="none"
                />
                {prop.asset === "fountain" && (
                  <ellipse
                    cx={p.x}
                    cy={p.y - 39}
                    rx="37"
                    ry="11"
                    fill="none"
                    stroke="#bfe4ff"
                    strokeWidth="1.7"
                    className={styles.ripple}
                  />
                )}
              </g>
            );
          }
          const id = item.key,
            player = item.player,
            p = project(player.x, player.y);
          const motion = motions[id];
          const walking = motion && motion.until > now && !player.table;
          const waving = emotes[id]?.text === "👋" && emotes[id].until > now;
          return (
            <g
              key={id}
              data-player={id}
              data-x={player.x}
              data-y={player.y}
              data-username={player.username}
              data-facing={motion?.facing ?? "front-left"}
              style={{
                transform: `translate(${p.x}px,${p.y}px)`,
                transition: "transform 65ms linear",
              }}
            >
              <ellipse cy="2" rx="13" ry="6" fill="#000" opacity=".35" />
              {id === self && (
                <ellipse
                  cy="2"
                  rx="17"
                  ry="8"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                />
              )}
              <AvatarSprite
                appearance={
                  player.appearance ?? {
                    character:
                      [...player.id].reduce((s, c) => s + c.charCodeAt(0), 0) %
                      2
                        ? "lavender"
                        : "peach",
                    hair: "original",
                    outfit: "original",
                  }
                }
                facing={player.table ? player.facing : motion?.facing}
                action={
                  player.table
                    ? "sit"
                    : walking
                      ? "walk"
                      : waving && (reduced || Math.floor(now / 300) % 2)
                        ? "wave"
                        : "idle"
                }
                now={now}
              />
            </g>
          );
        })}
        {/* Names and bubbles are separate from depth-sorted scenery for readability. */}
        {Object.entries(players).map(([id, player]) => {
          const p = project(player.x, player.y);
          const bubble = [...messages]
            .reverse()
            .find((m) => m.from === id && now - m.at < 5000);
          const emoji = emotes[id]?.until > now ? emotes[id].text : "";
          return (
            <g
              key={id}
              transform={`translate(${p.x},${p.y})`}
              pointerEvents="none"
            >
              <rect
                x="-54"
                y="12"
                width="108"
                height="22"
                rx="3"
                fill="#141414"
                fillOpacity=".92"
                stroke={id === self ? "#3b82f6" : "#303030"}
              />
              <circle cx="-43" cy="23" r="3" fill={player.color} />
              <text
                y="27"
                textAnchor="middle"
                fill="#ededed"
                fontSize="12"
                fontWeight="600"
              >
                {player.username.slice(0, 12)}
                {id === self ? " · bạn" : ""}
              </text>
              {emoji && (
                <text y="-72" textAnchor="middle" fontSize="27">
                  {emoji}
                </text>
              )}
              {bubble &&
                (() => {
                  const lines = wrapBubble(
                    `${bubble.scope === "table" ? "☕ " : ""}${bubble.text}`,
                  );
                  const widest = Math.max(...lines.map((l) => l.length));
                  const width = Math.max(64, widest * 7.1 + 24);
                  const height = lines.length * 18 + 14;
                  return (
                    <g className={styles.bubble}>
                      <rect
                        x={-width / 2}
                        y={-78 - height}
                        width={width}
                        height={height}
                        rx="4"
                        fill="#1c1c1c"
                        stroke="#383838"
                      />
                      {lines.map((line, i) => (
                        <text
                          key={i}
                          y={-78 - height + 21 + i * 18}
                          textAnchor="middle"
                          fill="#ededed"
                          fontSize="13"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })()}
            </g>
          );
        })}
        {action &&
          local &&
          (() => {
            const width = action.label.length * 7.6 + (showKeyHint ? 62 : 34);
            return (
              <g
                role="button"
                tabIndex={0}
                aria-label={action.label}
                className={styles.actionPill}
                transform={`translate(${local.x},${local.y + 62})`}
                onClick={(event) => {
                  event.stopPropagation();
                  action.run();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    action.run();
                  }
                }}
              >
                {/* Larger invisible area: the pill alone is small on a phone. */}
                <rect
                  x={-width / 2 - 8}
                  y="-32"
                  width={width + 16}
                  height="64"
                  fill="transparent"
                />
                <rect
                  data-face
                  x={-width / 2}
                  y="-19"
                  width={width}
                  height="38"
                  rx="4"
                  fill="#3b82f6"
                />
                <text
                  x={showKeyHint ? 13 : 0}
                  y="5"
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="700"
                >
                  {action.label}
                </text>
                {showKeyHint && (
                  <g transform={`translate(${-width / 2 + 11} -11)`}>
                    <rect
                      width="22"
                      height="22"
                      rx="3"
                      fill="#fff"
                      fillOpacity=".22"
                    />
                    <text
                      x="11"
                      y="15.5"
                      textAnchor="middle"
                      fill="#fff"
                      fontFamily={MONO}
                      fontSize="12"
                      fontWeight="700"
                    >
                      E
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
      </svg>
    </figure>
  );
}
