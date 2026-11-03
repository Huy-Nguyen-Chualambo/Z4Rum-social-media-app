"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { theaterSocket } from "@/lib/theater/roomSocket";
import type {
  Playback,
  RoomMember,
  RoomMessage,
  Screening,
} from "@/lib/theater/types";

type Shared = Omit<Playback, "receivedAt">;
type Snapshot = {
  roomId: string;
  self: string;
  guest: boolean;
  members: RoomMember[];
  playback: Shared;
};
const stamped = (value: Shared): Playback => ({
  ...value,
  receivedAt: Date.now(),
});

/** Owns the realtime connection for one room, from the link to leaving it. */
export function useTheaterRoom(roomId: string): Screening {
  const token = useAuthStore((s) => s.token);
  const link = useRef<Socket | null>(null);
  const [self, setSelf] = useState("");
  const [guest, setGuest] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [missing, setMissing] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const socket = theaterSocket(token);
    link.current = socket;
    const join = () => socket.emit("theater:join", { roomId });
    const snapshot = (data: Snapshot) => {
      setSelf(data.self);
      setGuest(data.guest);
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
    return () => {
      socket.emit("theater:leave");
      socket.disconnect();
      link.current = null;
    };
  }, [token, roomId]);

  return {
    self,
    guest,
    solo: false,
    members,
    playback,
    messages,
    missing,
    problem,
    isHost: Boolean(playback && playback.hostId === self),
    sync: (playing, position) => {
      link.current?.emit("theater:sync", { playing, position });
    },
    changeFilm: (film, playing, position) => {
      link.current?.emit("theater:film", { ...film, playing, position });
    },
    sendChat: (text) => {
      if (!text.trim()) return false;
      link.current?.emit("theater:chat", text.trim());
      return true;
    },
  };
}
