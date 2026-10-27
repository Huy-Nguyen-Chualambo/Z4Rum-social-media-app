"use client";

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from "react";
import { cafeTables, props, worldAssets } from "@/lib/world/assets";
import { cameraView, groundPolygon, project } from "@/lib/world/projection";
import type {
  Motion,
  WorldEmote,
  WorldMessage,
  WorldPlayer,
} from "@/lib/world/types";
import type { Point } from "@/lib/world/projection";
import { unproject } from "@/lib/world/navigation";
import AvatarSprite from "./AvatarSprite";
import styles from "./world-scene.module.css";
const subscribeReduced = (change: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
};

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
}: SceneProps) {
  const uid = useId().replace(/:/g, "");
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const me = players[self];
  const local = me ? project(me.x, me.y) : null;
  const view = cameraView(me?.x ?? 500, me?.y ?? 350, follow && Boolean(me));
  const viewport = useRef<SVGSVGElement>(null);
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
  ].sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));

  return (
    <figure className={styles.frame}>
      <div className={styles.sceneTop}>
        <span className={styles.liveDot} />
        QUẢNG TRƯỜNG BẢNH{" "}
        <span className={styles.sceneTopRight}>Gặp nhau một chút.</span>
      </div>
      <svg
        ref={viewport}
        data-testid="world-scene"
        viewBox="0 0 1760 1060"
        className={`${styles.scene} ${follow ? styles.follow : ""}`}
        role="group"
        aria-label="Z4world isometric: quán cà phê, Game Club và quảng trường với người chơi realtime"
        onClick={(event) => {
          const matrix = event.currentTarget.getScreenCTM();
          if (!matrix) return;
          const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
            matrix.inverse(),
          );
          onDestination(unproject(p.x, p.y));
        }}
      >
        <defs>
          <radialGradient id={`${uid}-sky`}>
            <stop stopColor="#fff9ec" />
            <stop offset="1" stopColor="#eee9db" />
          </radialGradient>
          <pattern
            id={`${uid}-grass`}
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <rect width="48" height="48" fill="#b7cb9b" />
            <path
              d="m9 12 2-3 2 3m22 22 2-3 2 3"
              fill="none"
              stroke="#a4bc87"
              strokeWidth="1.6"
            />
            <circle cx="30" cy="12" r="1.2" fill="#cedbb2" />
          </pattern>
          <pattern
            id={`${uid}-paving`}
            width="42"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <rect width="42" height="28" fill="#ead7b7" />
            <path
              d="M0 0h42v28H0zm21 0v28"
              fill="none"
              stroke="#d9c4a4"
              strokeWidth="1"
            />
            <path d="M1 1h39" stroke="#f8eacf" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect
          x="0"
          y="0"
          width="1760"
          height="1060"
          fill={`url(#${uid}-sky)`}
        />
        <ellipse
          cx="885"
          cy="765"
          rx="660"
          ry="155"
          fill="#82775c"
          opacity=".07"
        />
        <polygon
          points={groundPolygon(0, 0, 1000, 700)}
          transform="translate(0 14)"
          fill="#8fa97a"
          stroke="#8fa97a"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        <g transform="matrix(.8 .4 -.8 .4 760 220)">
          <rect
            width="1000"
            height="700"
            rx="12"
            fill={`url(#${uid}-grass)`}
            stroke="#d4debd"
            strokeWidth="10"
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
            stroke="#f4e5c9"
            strokeWidth="7"
          />
          <rect
            x="85"
            y="220"
            width="205"
            height="240"
            rx="24"
            fill="#ddcaa9"
            stroke="#f0dfc0"
            strokeWidth="7"
          />
          <rect
            x="700"
            y="220"
            width="210"
            height="75"
            rx="14"
            fill="#c9bbd4"
            stroke="#e8ddec"
            strokeWidth="6"
          />
          {[70, 930].flatMap((x) =>
            [250, 445, 575].map((y) => (
              <g key={`${x}-${y}`}>
                <ellipse cx={x} cy={y} rx="15" ry="10" fill="#9ebc84" />
                <circle cx={x - 5} cy={y - 2} r="4" fill="#edb5b3" />
                <circle cx={x + 4} cy={y + 2} r="4" fill="#f3d9a9" />
              </g>
            )),
          )}
        </g>
        {destination && (
          <g
            pointerEvents="none"
            transform={`translate(${project(destination.x, destination.y).x},${project(destination.x, destination.y).y})`}
          >
            <ellipse
              rx="14"
              ry="7"
              fill="#fff3c5"
              fillOpacity=".5"
              stroke="#578962"
              strokeWidth="2"
            />
            <path d="M-5 0h10M0-3v6" stroke="#578962" />
          </g>
        )}
        {ordered.map((item) => {
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
              prop.key === "club" ||
              prop.key === "cafe" ||
              cafeTables.some((t) => t.id === prop.key);
            return (
              <g
                key={item.key}
                opacity={occluded ? 0.35 : 1}
                className={styles.prop}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={
                  interactive
                    ? prop.key === "club"
                      ? "Vào Game Club"
                      : prop.key === "cafe"
                        ? "Đến quán cà phê"
                        : `Ngồi ${prop.key}`
                    : undefined
                }
                style={{ cursor: interactive ? "pointer" : undefined }}
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
                    stroke="#f1ffff"
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
              <ellipse cy="2" rx="13" ry="6" fill="#67573b" opacity=".18" />
              {id === self && (
                <ellipse
                  cy="2"
                  rx="17"
                  ry="8"
                  fill="none"
                  stroke="#fff7df"
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
                rx="11"
                fill={id === self ? "#fff8e8" : "#fffdf4"}
                fillOpacity=".94"
              />
              <circle cx="-42" cy="23" r="3" fill={player.color} />
              <text
                y="27"
                textAnchor="middle"
                fill="#4a5944"
                fontSize="12"
                fontWeight="650"
              >
                {player.username.slice(0, 12)}
                {id === self ? " · bạn" : ""}
              </text>
              {emoji && (
                <text y="-72" textAnchor="middle" fontSize="27">
                  {emoji}
                </text>
              )}
              {bubble && (
                <g className={styles.bubble}>
                  <rect
                    x="-110"
                    y="-108"
                    width="220"
                    height="30"
                    rx="13"
                    fill="#fffdf6"
                    stroke="#e4d5bb"
                  />
                  <text
                    y="-88"
                    textAnchor="middle"
                    fill="#4c5348"
                    fontSize="13"
                  >
                    {bubble.scope === "table" ? "☕ " : ""}
                    {bubble.text.slice(0, 27)}
                    {bubble.text.length > 27 ? "…" : ""}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {cafeTables.map((t, i) => {
          const p = project(t.x, t.y);
          return (
            <text
              key={t.id}
              x={p.x}
              y={p.y + 48}
              textAnchor="middle"
              fontSize="13"
              fill="#6f7057"
            >
              Bàn {i + 1}
            </text>
          );
        })}
        {[
          { text: "CÀ PHÊ HÓNG CHUYỆN", x: 165, y: 245 },
          { text: "GAME CLUB", x: 810, y: 255 },
          { text: "CÔNG VIÊN ANH EM", x: 500, y: 650 },
        ].map((label) => {
          const p = project(label.x, label.y);
          return (
            <Fragment key={label.text}>
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                fontSize="14"
                letterSpacing="1.5"
                fontWeight="700"
                fill="#736c5e"
                stroke="#fff5dc"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {label.text}
              </text>
            </Fragment>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>
        <span>
          <span className={styles.captionDot} /> Một khu phố nhỏ, nhiều chuyện
          để kể.
        </span>
        <span>☀ Chiều ấm áp</span>
      </figcaption>
    </figure>
  );
}
