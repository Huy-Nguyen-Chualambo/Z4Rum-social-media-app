"use client";
import { useState } from "react";
import type { Episode, Movie } from "@/lib/theater/movies";
import { chip, chipOff, chipOn, SOURCE_LABEL } from "./MovieBrowser";
import PosterImage from "./PosterImage";
import SaveButton from "./SaveButton";

export type EpisodePick = { server: number; episode: Episode };

/** Names are "1", "Tập 01"… for series but words like "FULL" for single films. */
export const episodeTitle = (name: string) =>
  /^\d/.test(name) ? `Tập ${name}` : name;

export function EpisodeList({
  movie,
  current,
  disabled = false,
  onPlay,
}: {
  movie: Movie;
  current: EpisodePick | null;
  disabled?: boolean;
  onPlay: (pick: EpisodePick) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const server = chosen ?? current?.server ?? 0;
  const episodes = movie.servers[server]?.episodes ?? [];
  return (
    <>
      {movie.servers.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          {movie.servers.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              className={`${chip} ${index === server ? chipOn : chipOff}`}
              aria-pressed={index === server}
              onClick={() => setChosen(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
      {episodes.length > 0 ? (
        <div className="mt-3 grid max-h-44 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5 overflow-y-auto">
          {episodes.map((episode) => {
            const active =
              current?.server === server &&
              current.episode.slug === episode.slug;
            return (
              <button
                key={episode.slug}
                aria-label={`Xem ${episodeTitle(episode.name)}`}
                aria-current={active}
                disabled={disabled}
                className={`${chip} ${active ? chipOn : chipOff} disabled:opacity-60`}
                onClick={() => onPlay({ server, episode })}
              >
                {episode.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#969696]">Phim này chưa có tập nào.</p>
      )}
    </>
  );
}

export default function MovieDetail({
  movie,
  disabled,
  onPlay,
}: {
  movie: Movie;
  disabled?: boolean;
  onPlay: (pick: EpisodePick) => void;
}) {
  return (
    <div>
      <div className="flex gap-4">
        {movie.poster && (
          <PosterImage
            src={movie.poster}
            className="hidden aspect-[2/3] w-40 shrink-0 rounded-sm bg-[#1c1c1c] object-cover sm:block"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#ededed]">{movie.name}</h2>
          {movie.originalName && (
            <p className="text-sm text-[#969696]">{movie.originalName}</p>
          )}
          <p className="mt-1 text-xs text-[#a3a3a3]">
            {[
              movie.year,
              movie.time,
              movie.quality,
              movie.language,
              movie.status,
              SOURCE_LABEL[movie.source],
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {movie.genres.length > 0 && (
            <p className="mt-1 text-xs text-[#a3a3a3]">
              {movie.genres.join(", ")}
            </p>
          )}
          {movie.description && (
            <p className="mt-2 line-clamp-4 text-sm text-[#dedede]">
              {movie.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3">
        <SaveButton film={movie} />
      </div>
      <p className="mt-3 text-xs text-[#969696]">
        Chọn tập để mở phòng riêng, rồi gửi link mời bạn bè xem cùng.
      </p>
      <EpisodeList movie={movie} current={null} disabled={disabled} onPlay={onPlay} />
    </div>
  );
}
