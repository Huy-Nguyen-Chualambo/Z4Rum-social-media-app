"use client";

import { useEffect, useState } from "react";
import { useSocketStore } from "@/lib/store/useSocketStore";
import type { MovieSource } from "@/lib/theater/movies";
import type { Playback, RoomMember, RoomMessage } from "@/lib/theater/types";

type Shared = Omit<Playback, "receivedAt">;
type Snapshot = {
  roomId: string;
  self: string;
  members: RoomMember[];
  playback: Shared;
};
export type FilmChoice = {
  source: MovieSource;
  slug: string;
  server: number;
  episode: string;
};
const stamped = (value: Shared): Playback => ({
  ...value,
  receivedAt: Date.now(),
});

/** Owns the realtime connection for one room, from the link to leaving it. */
export function useTheaterRoom(roomId: string) {
  const socket = useSocketStore((s) => s.socket);
  const [self, setSelf] = useState("");
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [missing, setMissing] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit("theater:join", { roomId });
    const snapshot = (data: Snapshot) => {
      setSelf(data.self);
      setMembers(data.members);
      setPlayback(stamped(data.playback));
      setProblem("");
    };
    const update = (value: Shared) => setPlayback(stamped(value));
    const chat = (message: RoomMessage) =>
      setMessages((previous) => [...previous.slice(-99), message]);
    const gone = () => setMissing(true);
    const lost = () => setProblem("Mất kết nối. Đang thử lại…");
    socket.on("connect", join);
    socket.on("disconnect", lost);
    socket.on("connect_error", lost);
    socket.on("theater:snapshot", snapshot);
    socket.on("theater:members", setMembers);
    socket.on("theater:playback", update);
    socket.on("theater:chat", chat);
    socket.on("theater:missing", gone);
    socket.on("theater:error", setProblem);
    if (socket.connected) join();
    return () => {
      socket.emit("theater:leave");
      socket.off("connect", join);
      socket.off("disconnect", lost);
      socket.off("connect_error", lost);
      socket.off("theater:snapshot", snapshot);
      socket.off("theater:members", setMembers);
      socket.off("theater:playback", update);
      socket.off("theater:chat", chat);
      socket.off("theater:missing", gone);
      socket.off("theater:error", setProblem);
    };
  }, [socket, roomId]);

  return {
    self,
    members,
    playback,
    messages,
    missing,
    problem,
    isHost: Boolean(playback && playback.hostId === self),
    sync: (playing: boolean, position: number) =>
      socket?.emit("theater:sync", { playing, position }),
    changeFilm: (film: FilmChoice, playing: boolean, position: number) =>
      socket?.emit("theater:film", { ...film, playing, position }),
    sendChat: (text: string) => {
      if (!text.trim()) return false;
      socket?.emit("theater:chat", text.trim());
      return true;
    },
  };
}
