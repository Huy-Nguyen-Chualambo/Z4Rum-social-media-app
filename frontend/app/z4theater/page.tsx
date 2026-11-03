"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RequireAuth from "../_components/RequireAuth";
import { useSocketStore } from "@/lib/store/useSocketStore";
import MovieBrowser, { quiet } from "./_components/MovieBrowser";
import MovieDetail, { type EpisodePick } from "./_components/MovieDetail";
import { usePickMovie } from "./_components/usePickMovie";

const CREATE_TIMEOUT_MS = 8_000;

export default function TheaterPage() {
  const router = useRouter();
  const socket = useSocketStore((s) => s.socket);
  const { movie, opening, notice, pick, clear } = usePickMovie();
  const [creating, setCreating] = useState(false);
  const [problem, setProblem] = useState("");
  const openRoom = (episode: EpisodePick) => {
    if (!movie || !socket) {
      setProblem("Chưa kết nối được. Hãy thử lại sau giây lát.");
      return;
    }
    setCreating(true);
    setProblem("");
    socket.timeout(CREATE_TIMEOUT_MS).emit(
      "theater:create",
      {
        source: movie.source,
        slug: movie.slug,
        server: episode.server,
        episode: episode.episode.slug,
      },
      (failed: Error | null, reply?: { roomId?: string; error?: string }) => {
        if (reply?.roomId) return router.push(`/z4theater/${reply.roomId}`);
        setCreating(false);
        setProblem(
          reply?.error ?? (failed && "Không tạo được phòng. Hãy thử lại.") ?? "",
        );
      },
    );
  };
  const message = problem || notice;
  return (
    <div>
      <RequireAuth />
      <section className="border-b border-[#292929] px-4 pb-5 pt-6 sm:px-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Rạp phim / Z4theater
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Z4theater
        </h1>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#a3a3a3]">
          Chọn phim, mở phòng riêng và gửi link cho bạn bè. Cả phòng xem cùng
          một đoạn và trò chuyện ngay cạnh màn hình.
        </p>
      </section>
      <section className="px-4 py-4 sm:px-5">
        {message && (
          <p
            role="alert"
            className="mb-3 rounded-sm border border-[#303030] bg-[#181818] px-3 py-2 text-sm text-[#dedede]"
          >
            {message}
          </p>
        )}
        {movie ? (
          <>
            <button className={`${quiet} mb-3`} onClick={clear}>
              <ArrowLeft size={16} />
              Danh sách phim
            </button>
            <MovieDetail movie={movie} disabled={creating} onPlay={openRoom} />
          </>
        ) : (
          <MovieBrowser busy={opening} onPick={pick} />
        )}
      </section>
    </div>
  );
}
