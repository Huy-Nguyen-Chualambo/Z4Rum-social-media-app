"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../_components/RequireAuth";
import { axiosClient } from "@/lib/api/axiosClient";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { worldAssets } from "@/lib/world/assets";
import { enterImmersive, PHONE_QUERY } from "@/lib/world/immersive";
import type { Appearance } from "@/lib/world/types";
import AvatarSprite from "./AvatarSprite";

const scenery = [
  { asset: "tree", x: 112, y: 262, scale: 0.8 },
  { asset: "cafe", x: 262, y: 262, scale: 0.86 },
  { asset: "club", x: 640, y: 262, scale: 0.86 },
  { asset: "tree", x: 806, y: 280, scale: 0.8 },
  { asset: "lamp", x: 368, y: 330, scale: 0.8 },
  { asset: "fountain", x: 452, y: 318, scale: 0.84 },
  { asset: "bench", x: 620, y: 392, scale: 0.9 },
] as const;
const tips = [
  {
    title: "Đi dạo",
    text: "WASD, phím mũi tên hoặc joystick. Bấm vào đất để tự đi tới đó.",
  },
  {
    title: "Ghé chơi",
    text: "Bấm vào bàn cà phê là nhân vật tự đi tới và ngồi xuống. Tin nhắn chỉ tới người ở gần bạn.",
  },
  {
    title: "Trên điện thoại",
    text: "Xoay ngang để có màn hình rộng hơn. Để dọc vẫn chơi được bình thường.",
  },
];

export default function WorldLanding() {
  const socket = useSocketStore((s) => s.socket);
  const [online, setOnline] = useState<number | null>(null);
  const [appearance, setAppearance] = useState<Appearance>({
    character: "peach",
    hair: "original",
    outfit: "original",
  });

  useEffect(() => {
    let active = true;
    axiosClient
      .get<Appearance>("/world/profile")
      .then(({ data }) => {
        if (active) setAppearance(data);
      })
      .catch(() => {
        // The default character is a fine preview when the profile can't load.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const ask = () => {
      if (socket.connected)
        socket.emit("world:presence", (value: { players: number }) =>
          setOnline(value.players),
        );
    };
    ask();
    socket.on("connect", ask);
    const timer = setInterval(ask, 20_000);
    return () => {
      socket.off("connect", ask);
      clearInterval(timer);
    };
  }, [socket]);

  return (
    <div>
      <RequireAuth />
      <section className="border-b border-[#292929] px-4 pb-5 pt-6 sm:px-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Khu phố / Z4world
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Z4world
        </h1>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#a3a3a3]">
          Khu phố nhỏ về đêm của anh em. Ghé quán cà phê, tán gẫu với người bên
          cạnh, rủ bạn bè vào cùng.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/z4world/play"
            onClick={() => {
              // Phones get the most room when asked now, during the tap itself.
              if (window.matchMedia(PHONE_QUERY).matches)
                void enterImmersive(true);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-blue-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            Vào thế giới
          </Link>
          {online !== null && (
            <p className="flex items-center gap-2 text-xs text-[#969696]">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${online ? "bg-blue-500" : "bg-[#4a4a4a]"}`}
              />
              {online
                ? `${online} người đang ở trong thế giới`
                : "Chưa có ai, hãy là người đầu tiên"}
            </p>
          )}
        </div>
      </section>
      <svg
        viewBox="30 10 840 480"
        className="block w-full border-b border-[#292929]"
        role="img"
        aria-label="Quán cà phê, Game Club, đài phun nước và nhân vật của bạn trong Z4world về đêm"
      >
        <defs>
          <radialGradient id="landing-warm">
            <stop stopColor="#ffbe74" stopOpacity=".4" />
            <stop offset="1" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon
          points="450,120 860,300 450,480 40,300"
          fill="#1a1a1a"
          transform="translate(0 10)"
        />
        <polygon
          points="450,120 860,300 450,480 40,300"
          fill="#1b2420"
          stroke="#303030"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <polygon
          points="450,245 640,330 450,415 260,330"
          fill="#2c2c2e"
          stroke="#3a3a3d"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <ellipse cx="290" cy="320" rx="170" ry="80" fill="url(#landing-warm)" />
        <ellipse cx="620" cy="320" rx="170" ry="80" fill="url(#landing-warm)" />
        <ellipse cx="452" cy="412" rx="110" ry="50" fill="url(#landing-warm)" />
        {scenery.map((item, i) => {
          const asset = worldAssets[item.asset];
          const w = asset.width * item.scale,
            h = asset.height * item.scale;
          return (
            <image
              key={i}
              href={asset.src}
              x={item.x - w / 2}
              y={item.y - h * asset.anchor}
              width={w}
              height={h}
            />
          );
        })}
        <g transform="translate(452 412) scale(1.5)">
          <ellipse cy="2" rx="17" ry="8" fill="#000" opacity=".4" />
          <AvatarSprite appearance={appearance} />
        </g>
      </svg>
      <ol>
        {tips.map(({ title, text }, i) => (
          <li
            key={title}
            className="border-b border-[#292929] px-4 py-4 sm:px-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              0{i + 1} / {title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#a3a3a3]">
              {text}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
