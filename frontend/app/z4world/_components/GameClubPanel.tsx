"use client";
import type { Socket } from "socket.io-client";
import type { WorldPlayer } from "@/lib/world/types";
import type { Floor, Game } from "./useWorldClient";

export default function GameClubPanel({
  socket,
  game,
  floor,
  players,
  self,
  now,
  inLobby,
  participating,
  answered,
  floorMember,
}: {
  socket: Socket | null;
  game: Game;
  floor: Floor;
  players: Record<string, WorldPlayer>;
  self: string;
  now: number;
  inLobby: boolean;
  participating: boolean;
  answered: boolean;
  floorMember: boolean;
}) {
  // During a timed match the other game only pushes the controls off a short screen.
  const inQuizRound = game.phase === "question" && participating;
  const inFloorRound = floor.phase === "running" && floorMember;
  return (
    <>
      {!inFloorRound && (
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
                    disabled={!participating || answered || now >= game.endsAt}
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
                5 câu hỏi, 12 giây/câu, 100 điểm/đáp án đúng. Hai người vào hàng
                đợi để bắt đầu.
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
      )}
      {!inQuizRound && (
        <section className="mb-3 rounded-xl border border-amber-900 bg-amber-950/20 p-4 [@media(max-height:500px)]:mb-1 [@media(max-height:500px)]:p-3 [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-[minmax(0,1fr)_auto] [@media(max-height:500px)]:gap-x-4">
          <div>
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
          </div>
          <div
            className="grid w-full max-w-xs grid-cols-6 gap-1 [@media(max-height:500px)]:col-start-2 [@media(max-height:500px)]:row-span-2 [@media(max-height:500px)]:row-start-1 [@media(max-height:500px)]:w-[50dvh]"
            aria-label="Sàn biến mất"
          >
            {Array.from({ length: 36 }, (_, cell) => {
              const mine = floor.pieces[self];
              const adjacent =
                mine &&
                Math.abs((cell % 6) - (mine.cell % 6)) +
                  Math.abs(Math.floor(cell / 6) - Math.floor(mine.cell / 6)) ===
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
                  className={`relative aspect-square min-h-9 rounded-md [@media(max-height:500px)]:min-h-0 border text-xs ${gone ? "border-neutral-900 bg-neutral-950" : floor.warning.includes(cell) ? "border-amber-300 bg-amber-400 text-black" : "border-emerald-700 bg-emerald-900"} ${adjacent && mine?.alive && !gone ? "ring-1 ring-white/60" : ""}`}
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
          <div>
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
          </div>
        </section>
      )}
    </>
  );
}
