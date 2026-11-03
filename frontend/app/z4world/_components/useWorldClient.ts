"use client";

import { useEffect, useRef, useState } from "react";
import { useSocketStore } from "@/lib/store/useSocketStore";
import { facingFor, screenDirection } from "@/lib/world/projection";
import type { Point } from "@/lib/world/projection";
import { findPath, type Geometry } from "@/lib/world/navigation";
import {
  advanceRoute,
  createMoveTracker,
  nearWaypoint,
} from "@/lib/world/movement";
import { cafeTables } from "@/lib/world/assets";
import type {
  WorldPlayer as Player,
  WorldMessage as Message,
  Motion,
  Appearance,
  Screening,
} from "@/lib/world/types";

type Snapshot = {
  roomId: string;
  self: string;
  players: Record<string, Player>;
  screening: Screening | null;
  geometry: Geometry;
};
const tables = cafeTables;

/** Owns the realtime connection, world state and movement input for one visit. */
export function useWorldClient() {
  const socket = useSocketStore((s) => s.socket);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const positions = useRef<Record<string, Player>>({});
  const [motions, setMotions] = useState<Record<string, Motion>>({});
  const [self, setSelf] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("Đang kết nối thế giới…");
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotes, setEmotes] = useState<
    Record<string, { text: string; until: number }>
  >({});
  const [screening, setScreening] = useState<Screening | null>(null);
  const [scope, setScope] = useState("nearby");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const keys = useRef(new Set<string>());
  const touch = useRef({ dx: 0, dy: 0 });
  const identity = useRef("");
  const geometry = useRef<Geometry | null>(null);
  const route = useRef<Point[]>([]);
  const routeProgress = useRef({ gap: Infinity, at: 0 });
  const moves = useRef(createMoveTracker());
  const [destination, setDestination] = useState<Point | null>(null);
  const [panel, setPanel] = useState<"cinema" | "wardrobe" | null>(null);
  const paused = useRef(false);
  /** Tapping a place walks there and then acts, instead of asking for a second tap. */
  const arrival = useRef<string | null>(null);
  const [hasWalked, setHasWalked] = useState(false);
  const interaction = useRef<() => void>(() => {});
  const me = players[self];
  const inCinema = Boolean(me && me.x >= 650 && me.y <= 300);
  const nearTable =
    me && tables.find((t) => Math.hypot(me.x - t.x, me.y - t.y) <= 85);
  const stop = () => {
    keys.current.clear();
    touch.current = { dx: 0, dy: 0 };
    route.current = [];
    arrival.current = null;
    setDestination(null);
  };
  const open = (value: "cinema" | "wardrobe" | null) => {
    stop();
    paused.current = Boolean(value);
    setPanel(value);
  };
  const navigate = (target: Point) => {
    if (!me || !geometry.current || paused.current || me.table) return;
    const path = findPath(
      moves.current.predict(me, Date.now()),
      target,
      geometry.current,
    );
    stop();
    route.current = path;
    routeProgress.current = { gap: Infinity, at: Date.now() };
    setDestination(path.at(-1) ?? null);
    if (!path.length)
      setNotice(
        "Không tìm được đường tới vị trí này. Hãy chọn một khoảng đất trống.",
      );
  };
  const interact = (id: string) => {
    if (!me) return;
    if (id === "cinema") {
      if (inCinema) open("cinema");
      else {
        navigate({ x: 805, y: 250 });
        arrival.current = id;
      }
      return;
    }
    const table = tables.find((t) => t.id === id);
    if (table) {
      if (Math.hypot(me.x - table.x, me.y - table.y) <= 85) {
        stop();
        socket?.emit("world:sit", id);
      } else {
        navigate(table);
        arrival.current = id;
      }
      return;
    }
    if (id === "cafe") navigate({ x: 180, y: 250 });
  };
  useEffect(() => {
    interaction.current = () => {
      if (me?.table) {
        stop();
        socket?.emit("world:stand");
      } else if (nearTable) interact(nearTable.id);
      else if (inCinema) interact("cinema");
    };
  });

  useEffect(() => {
    if (!socket) return;
    const join = () => {
      setStatus("Đang vào quảng trường…");
      socket.emit("world:join", {
        roomId: new URLSearchParams(window.location.search).get("room"),
      });
    };
    const snapshot = (data: Snapshot) => {
      positions.current = { ...data.players };
      identity.current = data.self;
      geometry.current = data.geometry;
      moves.current.reset();
      route.current = [];
      setDestination(null);
      setMotions({});
      setPlayers(data.players);
      setSelf(data.self);
      setRoom(data.roomId);
      setScreening(data.screening);
      setStatus("");
      setMessages([]);
      setEmotes({});
    };
    const joined = ({ id, player }: { id: string; player: Player }) => {
      positions.current = { ...positions.current, [id]: player };
      setPlayers((p) => ({ ...p, [id]: player }));
    };
    const left = (id: string) => {
      delete positions.current[id];
      setMotions((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setPlayers((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setEmotes((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    };
    const moved = ({ id, x, y }: { id: string; x: number; y: number }) => {
      const previous = positions.current[id];
      if (!previous) return;
      const dx = x - previous.x,
        dy = y - previous.y;
      if (id === identity.current) moves.current.confirmed();
      if (dx || dy) {
        if (id === identity.current) setHasWalked(true);
        setMotions((m) => ({
          ...m,
          [id]: {
            facing: facingFor(dx, dy, m[id]?.facing),
            until: Date.now() + 180,
          },
        }));
      }
      positions.current = { ...positions.current, [id]: { ...previous, x, y } };
      setPlayers((p) => (p[id] ? { ...p, [id]: { ...p[id], x, y } } : p));
    };
    const chat = (m: Message) =>
      setMessages((previous) => [...previous.slice(-39), m]);
    const emote = ({ id, emote: emoji }: { id: string; emote: string }) =>
      setEmotes((p) => ({
        ...p,
        [id]: { text: emoji, until: Date.now() + 3500 },
      }));
    const showNotice = (value: string) => setNotice(value);
    const appearanceUpdate = ({
      id,
      appearance,
    }: {
      id: string;
      appearance: Appearance;
    }) => {
      if (positions.current[id])
        positions.current[id] = { ...positions.current[id], appearance };
      setPlayers((value) =>
        value[id] ? { ...value, [id]: { ...value[id], appearance } } : value,
      );
    };
    const clearWorld = () => {
      positions.current = {};
      identity.current = "";
      moves.current.reset();
      route.current = [];
      keys.current.clear();
      touch.current = { dx: 0, dy: 0 };
      paused.current = false;
      setPanel(null);
      setDestination(null);
      setPlayers({});
      setRoom("");
      setScreening(null);
    };
    const disconnected = () => {
      setStatus("Mất kết nối. Đang thử lại…");
      clearWorld();
    };
    const error = (message: string) => {
      setStatus(message);
      clearWorld();
    };
    socket.on("connect", join);
    socket.on("disconnect", disconnected);
    socket.on("world:snapshot", snapshot);
    socket.on("world:joined", joined);
    socket.on("world:left", left);
    socket.on("world:moved", moved);
    socket.on("world:chat", chat);
    socket.on("world:emote", emote);
    socket.on("world:screening", setScreening);
    socket.on("world:error", error);
    socket.on("world:notice", showNotice);
    socket.on("connect_error", disconnected);
    socket.on("world:appearance", appearanceUpdate);
    if (socket.connected) join();
    return () => {
      socket.emit("world:leave");
      socket.off("connect", join);
      socket.off("disconnect", disconnected);
      socket.off("world:snapshot", snapshot);
      socket.off("world:joined", joined);
      socket.off("world:left", left);
      socket.off("world:moved", moved);
      socket.off("world:chat", chat);
      socket.off("world:emote", emote);
      socket.off("world:screening", setScreening);
      socket.off("world:error", error);
      socket.off("world:notice", showNotice);
      socket.off("connect_error", disconnected);
      socket.off("world:appearance", appearanceUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        paused.current ||
        (event.target as HTMLElement).closest(
          "input, textarea, select, [contenteditable=true]",
        )
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "e" && !event.repeat) {
        event.preventDefault();
        interaction.current();
        return;
      }
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
        ].includes(key)
      ) {
        event.preventDefault();
        route.current = [];
        setDestination(null);
        keys.current.add(key);
      }
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(
        event.key.length === 1 ? event.key.toLowerCase() : event.key,
      );
    const clear = () => {
      keys.current.clear();
      touch.current = { dx: 0, dy: 0 };
      route.current = [];
      setDestination(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    const sendMove = (dx: number, dy: number, now: number) => {
      socket?.emit("world:move", { dx, dy });
      moves.current.sent(dx, dy, now);
    };
    const tick = setInterval(() => {
      const actor = positions.current[identity.current];
      if (paused.current || !actor || actor.table || !socket?.connected) return;
      const goal = arrival.current;
      if (goal === "cinema" && actor.x >= 650 && actor.y <= 300) {
        arrival.current = null;
        clear();
        paused.current = true;
        setPanel("cinema");
        return;
      }
      const goalTable = tables.find((t) => t.id === goal);
      if (
        goalTable &&
        Math.hypot(actor.x - goalTable.x, actor.y - goalTable.y) <= 85
      ) {
        arrival.current = null;
        clear();
        socket.emit("world:sit", goalTable.id);
        return;
      }
      // Walking away by hand, or a blocked route, cancels the pending action.
      if (goal && !route.current.length) arrival.current = null;
      const k = keys.current;
      const dx =
        Number(k.has("ArrowRight") || k.has("d")) -
          Number(k.has("ArrowLeft") || k.has("a")) || touch.current.dx;
      const dy =
        Number(k.has("ArrowDown") || k.has("s")) -
          Number(k.has("ArrowUp") || k.has("w")) || touch.current.dy;
      if ((dx || dy) && socket?.connected) {
        route.current = [];
        setDestination(null);
        const direction = screenDirection(dx, dy);
        sendMove(direction.x, direction.y, Date.now());
      } else if (route.current.length) {
        const time = Date.now();
        const at = moves.current.predict(actor, time);
        const remaining = advanceRoute(
          route.current,
          at,
          moves.current.settled(time),
        );
        const advanced = remaining.length < route.current.length;
        route.current = remaining;
        const target = remaining[0];
        if (!target) {
          setDestination(null);
          return;
        }
        // Progress means getting closer: circling also changes position.
        const gap = Math.hypot(target.x - actor.x, target.y - actor.y);
        if (advanced || gap < routeProgress.current.gap - 1)
          routeProgress.current = { gap, at: time };
        else if (time - routeProgress.current.at > 1800) {
          route.current = [];
          setDestination(null);
          setNotice("Đường đi đang bị chặn. Hãy chọn lại một điểm gần đó.");
          return;
        }
        // Already there on paper: wait for the server to confirm.
        if (remaining.length === 1 && nearWaypoint(at, target)) return;
        const length = Math.hypot(target.x - at.x, target.y - at.y);
        sendMove((target.x - at.x) / length, (target.y - at.y) / length, time);
      }
    }, 60);
    const clock = setInterval(() => setNow(Date.now()), 100);
    return () => {
      clearInterval(tick);
      clearInterval(clock);
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [socket]);

  useEffect(() => {
    // A fallback invite link stays up: the player still has to copy it by hand.
    if (!notice || notice.startsWith("Link mời")) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const setTouch = (value: { dx: number; dy: number }) => {
    touch.current = value;
    if (value.dx || value.dy) {
      route.current = [];
      setDestination(null);
    }
  };
  const sendChat = (value: string) => {
    if (!value.trim() || !me) return false;
    socket?.emit("world:chat", {
      text: value.trim(),
      scope: me.table ? scope : "nearby",
    });
    return true;
  };
  const sit = (id: string) => socket?.emit("world:sit", id);
  const stand = () => {
    socket?.emit("world:stand");
    setScope("nearby");
  };
  const sendEmote = (emoji: string) => socket?.emit("world:emote", emoji);
  const showFilm = (slug: string, server: number, episode: string) =>
    socket?.emit("world:screening:start", { slug, server, episode });
  const stopShowing = () => socket?.emit("world:screening:stop");
  const retry = () => {
    if (socket?.connected) socket.emit("world:join");
    else socket?.connect();
  };
  const invite = async () => {
    const url = new URL("/z4world/play", window.location.origin);
    url.searchParams.set("room", room);
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice("Đã chép link mời bạn vào cùng sảnh.");
    } catch {
      setNotice(`Link mời: ${url.toString()}`);
    }
  };
  const saveAppearance = (appearance: Appearance) => {
    setPlayers((value) =>
      value[self]
        ? { ...value, [self]: { ...value[self], appearance } }
        : value,
    );
    open(null);
    setNotice("Đã lưu ngoại hình theo tài khoản.");
  };

  return {
    socket,
    players,
    motions,
    self,
    room,
    status,
    messages,
    emotes,
    screening,
    scope,
    setScope,
    notice,
    setNotice,
    now,
    destination,
    panel,
    me,
    inCinema,
    nearTable,
    hasWalked,
    open,
    stop,
    navigate,
    interact,
    setTouch,
    sendChat,
    sit,
    stand,
    sendEmote,
    showFilm,
    stopShowing,
    retry,
    invite,
    saveAppearance,
  };
}
