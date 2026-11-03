"use client";
import { useState } from "react";
import { X } from "lucide-react";
import {
  forgetWatched,
  useLibrary,
  type WatchedFilm,
} from "@/lib/theater/library";
import type { MovieCard } from "@/lib/theater/movies";
import type { FilmChoice } from "@/lib/theater/types";
import { chip, chipOff, chipOn } from "./MovieBrowser";
import PosterImage from "./PosterImage";

const clock = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(Math.floor(seconds % 60)).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
};
const poster =
  "relative block aspect-[2/3] overflow-hidden rounded-sm border border-[#292929] bg-[#1c1c1c] group-hover:border-blue-500";

function Poster({ film }: { film: MovieCard }) {
  return (
    <span className={poster}>
      {film.poster && (
        <PosterImage
          src={film.poster}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/** What this device watched and saved. Hidden until there is something to show. */
export default function LibraryShelf({
  busy,
  onResume,
  onPick,
}: {
  busy: boolean;
  onResume: (film: FilmChoice, position: number) => void;
  onPick: (film: MovieCard) => void;
}) {
  const { history, saved } = useLibrary();
  const [wanted, setWanted] = useState<"history" | "saved">("history");
  if (!history.length && !saved.length) return null;
  const tab = !history.length ? "saved" : !saved.length ? "history" : wanted;
  const resume = (film: WatchedFilm) =>
    onResume(
      {
        source: film.source,
        slug: film.slug,
        server: film.server,
        episode: film.episode,
      },
      film.position,
    );
  const row = "flex gap-3 overflow-x-auto pb-1";
  const item = "group w-24 shrink-0 text-left disabled:opacity-60 sm:w-28";
  const title =
    "mt-1 line-clamp-2 block text-xs font-semibold leading-snug text-[#dedede]";
  return (
    <section aria-label="Phim của bạn" className="mb-4">
      <div className="mb-2 flex gap-1.5">
        {history.length > 0 && (
          <button
            className={`${chip} ${tab === "history" ? chipOn : chipOff}`}
            aria-pressed={tab === "history"}
            onClick={() => setWanted("history")}
          >
            Xem tiếp
          </button>
        )}
        {saved.length > 0 && (
          <button
            className={`${chip} ${tab === "saved" ? chipOn : chipOff}`}
            aria-pressed={tab === "saved"}
            onClick={() => setWanted("saved")}
          >
            Đã lưu ({saved.length})
          </button>
        )}
      </div>
      {tab === "history" ? (
        <div className={row}>
          {history.map((film) => (
            <div key={`${film.source}:${film.slug}`} className="relative">
              <button
                aria-label={`Xem tiếp ${film.name}`}
                disabled={busy}
                className={item}
                onClick={() => resume(film)}
              >
                <Poster film={film} />
                <span className={title}>{film.name}</span>
                <span className="block truncate text-[11px] text-[#858585]">
                  {film.episodeName}
                  {film.position > 0 ? ` · ${clock(film.position)}` : ""}
                </span>
              </button>
              <button
                aria-label={`Xoá ${film.name} khỏi lịch sử`}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-sm bg-black/80 text-white"
                onClick={() => forgetWatched(film)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={row}>
          {saved.map((film) => (
            <button
              key={`${film.source}:${film.slug}`}
              aria-label={`Mở phim đã lưu ${film.name}`}
              disabled={busy}
              className={item}
              onClick={() => onPick(film)}
            >
              <Poster film={film} />
              <span className={title}>{film.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
