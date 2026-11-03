"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2, Move, Smartphone } from "lucide-react";
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
    icon: Move,
    title: "Đi dạo",
    text: "Dùng WASD, phím mũi tên hoặc joystick. Bấm vào đất để tự đi tới đó.",
  },
  {
    icon: Gamepad2,
    title: "Gặp nhau",
    text: "Ngồi cà phê tán gẫu, hoặc rủ bạn vào Game Club chơi đố vui và sàn biến mất.",
  },
  {
    icon: Smartphone,
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
    <div className="p-3 sm:p-5">
      <RequireAuth />
      <section className="overflow-hidden rounded-3xl bg-[#f2eddf] text-[#3e4a38]">
        <div className="px-5 pt-6 sm:px-8 sm:pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#6f8a5c]">
            Một góc thế giới của anh em
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
            Z4world
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5d6655] sm:text-base">
            Khu phố nhỏ để gặp nhau, ngồi cà phê và chơi mini game cùng bạn bè.
          </p>
        </div>
        <svg
          viewBox="30 10 840 480"
          className="block w-full"
          role="img"
          aria-label="Quán cà phê, Game Club, đài phun nước và nhân vật của bạn trong Z4world"
        >
          <polygon
            points="450,120 860,300 450,480 40,300"
            fill="#8fa97a"
            transform="translate(0 10)"
          />
          <polygon
            points="450,120 860,300 450,480 40,300"
            fill="#b7cb9b"
            stroke="#d4debd"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <polygon
            points="450,245 640,330 450,415 260,330"
            fill="#ead7b7"
            stroke="#f4e5c9"
            strokeWidth="5"
            strokeLinejoin="round"
          />
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
            <ellipse cy="2" rx="17" ry="8" fill="#67573b" opacity=".2" />
            <AvatarSprite appearance={appearance} />
          </g>
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pb-6 sm:px-8 sm:pb-8">
          <Link
            href="/z4world/play"
            onClick={() => {
              // Phones get the most room when asked now, during the tap itself.
              if (window.matchMedia(PHONE_QUERY).matches)
                void enterImmersive(true);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#4f6b43] px-7 text-base font-bold text-white shadow-md transition-colors hover:bg-[#435c39]"
          >
            Vào thế giới
          </Link>
          {online !== null && (
            <p className="flex items-center gap-2 text-sm text-[#5d6655]">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${online ? "bg-[#6f9a58]" : "bg-[#b8b39f]"}`}
              />
              {online
                ? `${online} người đang ở trong thế giới`
                : "Chưa có ai, hãy là người đầu tiên"}
            </p>
          )}
        </div>
      </section>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {tips.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl border border-neutral-800 p-4">
            <Icon size={18} className="text-[#b9cda2]" aria-hidden />
            <h2 className="mt-2 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">
              {text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
