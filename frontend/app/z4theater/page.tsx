"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { createRoom } from "@/lib/theater/roomSocket";
import { watchPath } from "@/lib/theater/watchLink";
import MovieBrowser, { quiet } from "./_components/MovieBrowser";
import MovieDetail, { type EpisodePick } from "./_components/MovieDetail";
import { usePickMovie } from "./_components/usePickMovie";

export default function TheaterPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { movie, opening, notice, pick, clear } = usePickMovie();
  const [creating, setCreating] = useState(false);
  const [problem, setProblem] = useState("");
  const watch = async (episode: EpisodePick) => {
    if (!movie) return;
    const film = {
      source: movie.source,
      slug: movie.slug,
      server: episode.server,
      episode: episode.episode.slug,
    };
    if (!token) return router.push(watchPath(film));
    setCreating(true);
    setProblem("");
    try {
      router.push(`/z4theater/${await createRoom(token, film)}`);
    } catch (reason) {
      setCreating(false);
      setProblem((reason as Error).message);
    }
  };
  const message = problem || notice;
  return (
    <div>
      <section className="border-b border-[#292929] px-4 pb-5 pt-6 sm:px-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Rạp phim / Z4theater
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Z4theater
        </h1>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#a3a3a3]">
          Chọn phim là xem được ngay. Đăng nhập khi muốn mở phòng riêng và gửi
          link cho bạn bè: cả phòng xem cùng một đoạn và trò chuyện cạnh màn
          hình.
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
            <MovieDetail movie={movie} disabled={creating} onPlay={watch} />
          </>
        ) : (
          <MovieBrowser busy={opening} onPick={pick} />
        )}
      </section>
    </div>
  );
}
