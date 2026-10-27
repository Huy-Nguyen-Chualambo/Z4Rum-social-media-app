"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import RequireAuth from "../_components/RequireAuth";
import { useSocketStore } from "@/lib/store/useSocketStore";
import WorldScene from "./_components/WorldScene";
import WorldDialog from "./_components/WorldDialog";
import Wardrobe from "./_components/Wardrobe";
import Joystick from "./_components/Joystick";
import { screenDirection } from "@/lib/world/projection";
import type { Point } from "@/lib/world/projection";
import { findPath, type Geometry } from "@/lib/world/navigation";
import { cafeTables } from "@/lib/world/assets";
import type {
  WorldPlayer as Player,
  WorldMessage as Message,
  Motion,
  Appearance,
} from "@/lib/world/types";

type Game = {
  phase: "waiting" | "question" | "results";
  round: string;
  participants: string[];
  scores: Record<string, number>;
  endsAt: number;
  question: {
    text: string;
    options: string[];
    number: number;
    total: number;
  } | null;
};
type Floor = {
  phase: "waiting" | "running" | "results";
  pieces: Record<string, { cell: number; alive: boolean }>;
  fallen: number[];
  warning: number[];
  round: number;
  endsAt: number;
};
type Snapshot = {
  roomId: string;
  self: string;
  players: Record<string, Player>;
  game: Game;
  floor: Floor;
  geometry: Geometry;
};
const initialGame: Game = {
  phase: "waiting",
  round: "",
  participants: [],
  scores: {},
  endsAt: 0,
  question: null,
};
const initialFloor: Floor = {
  phase: "waiting",
  pieces: {},
  fallen: [],
  warning: [],
  round: 0,
  endsAt: 0,
};
const tables = cafeTables;
const directions = [
  { label: "↑", dx: 0, dy: -1 },
  { label: "←", dx: -1, dy: 0 },
  { label: "↓", dx: 0, dy: 1 },
  { label: "→", dx: 1, dy: 0 },
];
const mobileQuery = "(max-width: 639px)";
const subscribeMobile = (change: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

export default function WorldPage() {
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
  const [game, setGame] = useState<Game>(initialGame);
  const [floor, setFloor] = useState<Floor>(initialFloor);
  const [scope, setScope] = useState("nearby");
  const [notice, setNotice] = useState("");
  const [zoomChoice, setZoom] = useState<boolean | null>(null);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
  const zoom = zoomChoice ?? mobile;
  const [text, setText] = useState("");
  const [answeredRound, setAnsweredRound] = useState("");
  const [now, setNow] = useState(0);
  const keys = useRef(new Set<string>());
  const touch = useRef({ dx: 0, dy: 0 });
  const identity = useRef("");
  const geometry = useRef<Geometry | null>(null);
  const route = useRef<Point[]>([]);
  const routeProgress = useRef({ x: 0, y: 0, at: 0 });
  const [destination, setDestination] = useState<Point | null>(null);
  const [panel, setPanel] = useState<"games" | "wardrobe" | null>(null);
  const paused = useRef(false);
  const interaction = useRef<() => void>(() => {});
  const me = players[self];
  const inLobby = Boolean(me && me.x >= 650 && me.y <= 300);
  const participating = game.participants.includes(self);
  const answered = answeredRound === game.round;
  const nearTable =
    me && tables.find((t) => Math.hypot(me.x - t.x, me.y - t.y) <= 85);
  const floorMember = Boolean(floor.phase !== "results" && floor.pieces[self]);
  const stop = () => {
    keys.current.clear();
    touch.current = { dx: 0, dy: 0 };
    route.current = [];
    setDestination(null);
  };
  const open = (value: "games" | "wardrobe" | null) => {
    stop();
    paused.current = Boolean(value);
    setPanel(value);
  };
  const navigate = (target: Point) => {
    if (!me || !geometry.current || paused.current || me.table) return;
    const path = findPath(me, target, geometry.current);
    stop();
    route.current = path;
    routeProgress.current = { x: me.x, y: me.y, at: Date.now() };
    setDestination(path.at(-1) ?? null);
    if (!path.length)
      setNotice(
        "Không tìm được đường tới vị trí này. Hãy chọn một khoảng đất trống.",
      );
  };
  const interact = (id: string) => {
    if (!me) return;
    if (id === "club") {
      if (inLobby) open("games");
      else {
        navigate({ x: 805, y: 250 });
        setNotice("Đang đi tới Game Club. Tới nơi hãy bấm “Vào Game Club”.");
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
        setNotice("Đang đi tới bàn. Tới gần hãy chọn “Ngồi bàn cà phê”.");
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
      else if (inLobby) interact("club");
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
      route.current = [];
      setDestination(null);
      setMotions({});
      setPlayers(data.players);
      setSelf(data.self);
      setRoom(data.roomId);
      setGame(data.game);
      setFloor(data.floor);
      setStatus("");
      setMessages([]);
      setEmotes({});
      setAnsweredRound("");
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
      if (dx || dy) {
        const right = dx - dy >= 0,
          front = dx + dy >= 0;
        setMotions((m) => ({
          ...m,
          [id]: {
            facing: front
              ? right
                ? "front-right"
                : "front-left"
              : right
                ? "back-right"
                : "back-left",
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
    const gameUpdate = (value: Game) => setGame(value);
    const floorUpdate = (value: Floor) => setFloor(value);
    const showNotice = (value: string) => setNotice(value);
    const accepted = (round: string) => setAnsweredRound(round);
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
      route.current = [];
      keys.current.clear();
      touch.current = { dx: 0, dy: 0 };
      paused.current = false;
      setPanel(null);
      setDestination(null);
      setPlayers({});
      setRoom("");
      setGame(initialGame);
      setFloor(initialFloor);
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
    socket.on("world:game", gameUpdate);
    socket.on("world:quiz:accepted", accepted);
    socket.on("world:error", error);
    socket.on("world:floor", floorUpdate);
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
      socket.off("world:game", gameUpdate);
      socket.off("world:quiz:accepted", accepted);
      socket.off("world:error", error);
      socket.off("world:floor", floorUpdate);
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
    const tick = setInterval(() => {
      const actor = positions.current[identity.current];
      if (paused.current || !actor || actor.table || !socket?.connected) return;
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
        socket.emit("world:move", { dx: direction.x, dy: direction.y });
      } else if (route.current.length) {
        while (
          route.current.length &&
          Math.hypot(
            actor.x - route.current[0].x,
            actor.y - route.current[0].y,
          ) <= 6
        )
          route.current.shift();
        const target = route.current[0];
        if (!target) {
          setDestination(null);
          return;
        }
        const previous = routeProgress.current;
        if (Math.hypot(actor.x - previous.x, actor.y - previous.y) > 5)
          routeProgress.current = { x: actor.x, y: actor.y, at: Date.now() };
        else if (Date.now() - previous.at > 1800) {
          route.current = [];
          setDestination(null);
          setNotice("Đường đi đang bị chặn. Hãy chọn lại một điểm gần đó.");
          return;
        }
        const length = Math.hypot(target.x - actor.x, target.y - actor.y);
        socket.emit("world:move", {
          dx: (target.x - actor.x) / length,
          dy: (target.y - actor.y) / length,
        });
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

  return (
    <div className="p-3 sm:p-5">
      <RequireAuth />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[.3em] text-[#b9cda2]">
            Một góc thế giới của anh em
          </p>
          <h1 className="text-3xl font-black">
            Z4world{" "}
            <span className="text-xs font-normal text-[#bdb09a]">
              khu phố nhỏ của mình
            </span>
          </h1>
        </div>
        <span className="rounded-full border border-emerald-800 px-3 py-1 text-xs text-emerald-300">
          {room
            ? `Sảnh ${room.split(":")[1]} · ${Object.keys(players).length}/20 người`
            : "Đang kết nối"}
        </span>
      </header>
      <p className="mb-3 text-xs text-neutral-400">
        WASD / phím mũi tên, joystick hoặc chạm đất để đi. Chọn quán cà phê, bàn
        hoặc GAME CLUB để tương tác; phím E khi ở gần.
      </p>
      {status && (
        <div
          role="status"
          className="mb-3 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200"
        >
          {status}{" "}
          <button
            className="underline"
            onClick={() => {
              if (socket?.connected) socket.emit("world:join");
              else socket?.connect();
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <button
          className="rounded-lg border border-neutral-700 px-3 py-2"
          onClick={() => setZoom(!zoom)}
        >
          {zoom ? "Xem toàn cảnh" : "Theo chân nhân vật"}
        </button>
        <button
          disabled={!me}
          className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-40"
          onClick={() => open("wardrobe")}
        >
          Tủ đồ
        </button>
        <button
          disabled={!me}
          className="rounded-lg border border-violet-700 px-3 py-2 disabled:opacity-40"
          onClick={() => interact("club")}
        >
          {inLobby ? "Vào Game Club" : "Đi tới Game Club"}
        </button>
        <button
          disabled={!room}
          className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-40"
          onClick={async () => {
            const url = new URL("/z4world", window.location.origin);
            url.searchParams.set("room", room);
            try {
              await navigator.clipboard.writeText(url.toString());
              setNotice("Đã chép link mời bạn vào cùng sảnh.");
            } catch {
              setNotice(`Link mời: ${url.toString()}`);
            }
          }}
        >
          Mời bạn vào sảnh
        </button>
        {me?.table ? (
          <button
            className="rounded-lg bg-amber-800 px-3 py-2"
            onClick={() => {
              socket?.emit("world:stand");
              setScope("nearby");
            }}
          >
            Đứng dậy
          </button>
        ) : (
          nearTable && (
            <button
              className="rounded-lg bg-amber-800 px-3 py-2"
              onClick={() => socket?.emit("world:sit", nearTable.id)}
            >
              Ngồi bàn cà phê
            </button>
          )
        )}
      </div>
      {notice && (
        <p role="status" className="mb-3 break-words text-sm text-emerald-300">
          {notice}{" "}
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            ×
          </button>
        </p>
      )}
      {(participating || Boolean(floor.pieces[self])) && panel !== "games" && (
        <button
          className="mb-3 min-h-11 rounded-lg bg-violet-900 px-3 text-sm"
          onClick={() => open("games")}
        >
          Mở lại trận đấu ·{" "}
          {game.phase === "question"
            ? `Câu ${game.question?.number ?? ""}`
            : floor.phase === "running"
              ? `Vòng ${floor.round}`
              : game.phase === "results" || floor.phase === "results"
                ? "Xem kết quả"
                : "Đang chờ người chơi"}
        </button>
      )}
      <WorldScene
        players={players}
        self={self}
        messages={messages}
        emotes={emotes}
        motions={motions}
        now={now}
        follow={zoom}
        onDestination={navigate}
        onInteract={interact}
        destination={destination}
      />
      <div className="my-3 flex flex-wrap items-center justify-between gap-3">
        <Joystick
          key={`${Boolean(panel)}-${Boolean(me)}`}
          disabled={!me || Boolean(panel) || Boolean(me?.table)}
          onChange={(value) => {
            touch.current = value;
            if (value.dx || value.dy) {
              route.current = [];
              setDestination(null);
            }
          }}
        />
        <div className="flex gap-2" aria-label="Điều khiển di chuyển">
          {directions.map((d) => (
            <button
              disabled={!me || Boolean(panel) || Boolean(me?.table)}
              key={d.label}
              aria-label={`Di chuyển ${d.label}`}
              className="h-11 w-11 scroll-mb-28 scroll-mt-24 touch-none select-none rounded-xl border border-neutral-700 bg-neutral-800 text-xl active:bg-emerald-700 disabled:opacity-40"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                touch.current = d;
              }}
              onPointerUp={() => {
                touch.current = { dx: 0, dy: 0 };
              }}
              onPointerCancel={() => {
                touch.current = { dx: 0, dy: 0 };
              }}
              onLostPointerCapture={() => {
                touch.current = { dx: 0, dy: 0 };
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {["👋", "❤️", "😂", "🎉"].map((e) => (
            <button
              key={e}
              aria-label={`Biểu cảm ${e}`}
              onClick={() => socket?.emit("world:emote", e)}
              className="h-11 w-11 rounded-xl bg-neutral-800 text-xl"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      {panel === "wardrobe" && me && (
        <WorldDialog title="Tủ đồ của bạn" onClose={() => open(null)}>
          <Wardrobe
            initial={
              me.appearance ?? {
                character: "peach",
                hair: "original",
                outfit: "original",
              }
            }
            onSaved={(appearance) => {
              setPlayers((value) =>
                value[self]
                  ? { ...value, [self]: { ...value[self], appearance } }
                  : value,
              );
              open(null);
              setNotice("Đã lưu ngoại hình theo tài khoản.");
            }}
          />
        </WorldDialog>
      )}
      {panel === "games" && (
        <WorldDialog title="Game Club" onClose={() => open(null)}>
          <section className="mb-3 rounded-xl border border-violet-900 bg-violet-950/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-violet-300">
                Game Club · Đố vui anh em
              </h2>
              <span className="text-xs text-neutral-400">
                {game.participants.length} người
              </span>
            </div>
            {game.phase === "question" && game.question ? (
              <div className="mt-3">
                <p className="mb-2 text-xs text-neutral-400">
                  Câu {game.question.number}/{game.question.total} ·{" "}
                  {Math.max(0, Math.ceil((game.endsAt - now) / 1000))}s{" "}
                  {participating ? "" : "· Bạn đang xem"}
                </p>
                <p className="mb-3 font-semibold">{game.question.text}</p>
                <div className="grid grid-cols-2 gap-2">
                  {game.question.options.map((option, i) => (
                    <button
                      key={i}
                      disabled={
                        !participating || answered || now >= game.endsAt
                      }
                      onClick={() =>
                        socket?.emit("world:quiz:answer", {
                          round: game.round,
                          answer: i,
                        })
                      }
                      className="rounded-lg border border-violet-700 p-3 text-left text-sm hover:bg-violet-900 disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {answered && (
                  <p role="status" className="mt-2 text-sm text-emerald-300">
                    Đã nhận đáp án. Chờ câu tiếp theo!
                  </p>
                )}
              </div>
            ) : (
              <>
                {game.phase === "results" && (
                  <ol className="my-3 space-y-1">
                    {Object.entries(game.scores)
                      .sort((a, b) => b[1] - a[1])
                      .map(([id, score], i) => (
                        <li key={id} className="text-sm">
                          {i + 1}. {players[id]?.username || "Người chơi"} —{" "}
                          {score} điểm
                        </li>
                      ))}
                  </ol>
                )}
                <p className="my-2 text-sm text-neutral-400">
                  5 câu hỏi, 12 giây/câu, 100 điểm/đáp án đúng. Hai người vào
                  hàng đợi để bắt đầu.
                </p>
                <button
                  disabled={
                    !inLobby ||
                    floorMember ||
                    (game.phase === "waiting" && participating)
                  }
                  onClick={() => socket?.emit("world:quiz:join")}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {!inLobby
                    ? "Đi tới Game Club ở góc phải phía trên"
                    : participating && game.phase === "waiting"
                      ? "Đang chờ người chơi thứ hai…"
                      : "Tham gia quiz"}
                </button>
                {game.phase === "waiting" && participating && (
                  <button
                    className="ml-3 text-sm underline"
                    onClick={() => socket?.emit("world:quiz:leave")}
                  >
                    Rời hàng đợi quiz
                  </button>
                )}
              </>
            )}
          </section>
          <section className="mb-3 rounded-xl border border-amber-900 bg-amber-950/20 p-4">
            <h2 className="font-bold text-amber-300">
              Game Club · Sàn biến mất
            </h2>
            <p className="my-2 text-sm text-neutral-400">
              Chạm ô kề cạnh để di chuyển. Ô vàng sắp rơi, ô tối đã mất. Sống
              sót đến cuối để thắng!
            </p>
            {floor.phase === "running" && (
              <p className="mb-2 text-xs text-amber-200">
                Vòng {floor.round}/8 ·{" "}
                {Math.max(0, Math.ceil((floor.endsAt - now) / 1000))}s{" "}
                {floor.pieces[self]?.alive === false ? "· Bạn đã bị loại" : ""}
              </p>
            )}
            <div
              className="grid max-w-xs grid-cols-6 gap-1"
              aria-label="Sàn biến mất"
            >
              {Array.from({ length: 36 }, (_, cell) => {
                const mine = floor.pieces[self];
                const adjacent =
                  mine &&
                  Math.abs((cell % 6) - (mine.cell % 6)) +
                    Math.abs(
                      Math.floor(cell / 6) - Math.floor(mine.cell / 6),
                    ) ===
                    1;
                const gone = floor.fallen.includes(cell);
                const occupants = Object.entries(floor.pieces).filter(
                  ([, p]) => p.cell === cell && p.alive,
                );
                return (
                  <button
                    key={cell}
                    aria-label={`Ô ${cell + 1}`}
                    disabled={
                      floor.phase !== "running" ||
                      !mine?.alive ||
                      !adjacent ||
                      gone
                    }
                    onClick={() => socket?.emit("world:floor:move", cell)}
                    className={`relative aspect-square min-h-9 rounded-md border text-xs ${gone ? "border-neutral-900 bg-neutral-950" : floor.warning.includes(cell) ? "border-amber-300 bg-amber-400 text-black" : "border-emerald-700 bg-emerald-900"} ${adjacent && mine?.alive && !gone ? "ring-1 ring-white/60" : ""}`}
                  >
                    {occupants.map(([id]) => (
                      <span
                        key={id}
                        title={players[id]?.username}
                        style={{ color: players[id]?.color || "white" }}
                      >
                        {id === self ? "★" : "●"}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
            {floor.phase === "results" && (
              <p role="status" className="my-3 text-sm text-amber-200">
                Kết quả:{" "}
                {Object.entries(floor.pieces)
                  .filter(([, p]) => p.alive)
                  .map(([id]) => players[id]?.username || "Người chơi")
                  .join(", ") || "Không ai sống sót"}
                {Object.values(floor.pieces).some((p) => p.alive)
                  ? " sống sót!"
                  : "."}
              </p>
            )}
            {floor.phase !== "running" && (
              <button
                disabled={
                  !inLobby ||
                  (game.phase !== "results" && participating) ||
                  floorMember
                }
                onClick={() => socket?.emit("world:floor:join")}
                className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm disabled:opacity-40"
              >
                {floorMember
                  ? "Đang chờ người chơi thứ hai…"
                  : !inLobby
                    ? "Đến Game Club để tham gia"
                    : "Chơi sàn biến mất"}
              </button>
            )}
            {floorMember && (
              <button
                className="ml-3 mt-3 text-sm underline"
                onClick={() => socket?.emit("world:floor:leave")}
              >
                Rời sàn
              </button>
            )}
          </section>
        </WorldDialog>
      )}
      <section className="rounded-xl border border-neutral-800 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            Trò chuyện{" "}
            {scope === "table" && me?.table ? "riêng tại bàn" : "gần bạn"}
          </h2>
          <select
            aria-label="Kênh trò chuyện"
            value={me?.table ? scope : "nearby"}
            onChange={(e) => setScope(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 p-1 text-xs"
          >
            <option value="nearby">Gần bạn</option>
            {me?.table && <option value="table">Riêng tại bàn</option>}
          </select>
        </div>
        <div
          role="log"
          aria-live="polite"
          className="mb-3 flex max-h-36 flex-col overflow-y-auto text-sm"
        >
          {messages.length ? (
            messages.map((m) => (
              <p key={m.id} className="break-words py-1">
                <span className="font-semibold text-emerald-300">
                  {m.scope === "table" ? "[Bàn] " : ""}
                  {m.username}:{" "}
                </span>
                {m.text}
              </p>
            ))
          ) : (
            <p className="text-neutral-500">
              Lại gần một người và nói lời chào!
            </p>
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && me) {
              socket?.emit("world:chat", {
                text: text.trim(),
                scope: me.table ? scope : "nearby",
              });
              setText("");
            }
          }}
        >
          <input
            aria-label="Tin nhắn gần bạn"
            maxLength={200}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={stop}
            placeholder="Nói gì đó với anh em…"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <button
            disabled={!me || !text.trim()}
            className="rounded-lg bg-emerald-700 px-4 text-sm disabled:opacity-40"
          >
            Gửi
          </button>
        </form>
      </section>
    </div>
  );
}
