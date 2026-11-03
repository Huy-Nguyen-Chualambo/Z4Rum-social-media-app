"use client";
import { use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { createRoom } from "@/lib/theater/roomSocket";
import type { FilmChoice } from "@/lib/theater/types";
import { parseWatch, watchPath } from "@/lib/theater/watchLink";
import TheaterScreen from "../_components/TheaterScreen";
import { useSoloScreening } from "../_components/useSoloScreening";

const subscribeNever = () => () => {};

function Waiting({ text }: { text: string }) {
  return (
    <main className="flex h-dvh items-center justify-center bg-[#101010] text-sm text-[#a3a3a3]">
      {text}
    </main>
  );
}

function SoloScreen({
  film,
  position,
  notice,
}: {
  film: FilmChoice;
  position: number;
  notice: string;
}) {
  const room = useSoloScreening(film, position);
  return (
    <TheaterScreen
      room={room}
      initialNotice={notice}
      loginNext={(at) => watchPath(room.playback ?? film, at)}
    />
  );
}

/** A guest watches here. Someone with an account opens a room from the same moment instead. */
export default function TheaterWatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parseWatch(use(searchParams));
  const router = useRouter();
  // Who is logged in is only known in the browser.
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false);
  const token = useAuthStore((s) => s.token);
  const [problem, setProblem] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (!parsed) router.replace("/z4theater");
  }, [parsed, router]);
  const { film, position } = parsed ?? {};
  useEffect(() => {
    if (!token || !film || started.current) return;
    started.current = true;
    createRoom(token, film, position)
      .then((roomId) => router.replace(`/z4theater/${roomId}`))
      .catch((reason: Error) => setProblem(reason.message));
  }, [token, film, position, router]);
  if (!parsed || !inBrowser) return <Waiting text="Đang tải…" />;
  if (token && !problem) return <Waiting text="Đang mở phòng…" />;
  return <SoloScreen {...parsed} notice={problem} />;
}
