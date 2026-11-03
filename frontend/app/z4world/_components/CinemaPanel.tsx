"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, MessageCircle, Search } from "lucide-react";
import {
  getMovie,
  listMovies,
  searchMovies,
  shelves,
  type Episode,
  type Movie,
} from "@/lib/world/movies";
import type { Screening } from "@/lib/world/types";

type Source = { path: string } | { keyword: string };
type Pick = { server: number; episode: Episode };

const chip =
  "min-h-9 shrink-0 rounded-sm border px-3 text-xs font-semibold transition-colors";
const chipOn = "border-blue-500 bg-blue-500 text-white";
const chipOff = "border-[#303030] text-[#dedede] hover:bg-[#292929]";
const quiet =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-[#303030] px-3 text-sm hover:bg-[#292929]";

/** The film being shown in this room, if viewers here are allowed to see it. */
export function useScreeningMovie(screening: Screening | null) {
  const [found, setFound] = useState<{
    slug: string;
    movie: Movie | null;
  } | null>(null);
  const slug = screening?.slug;
  useEffect(() => {
    if (!slug) return;
    let live = true;
    getMovie(slug)
      .then((movie) => (movie.adult ? null : movie))
      .catch(() => null)
      .then((movie) => {
        if (live) setFound({ slug, movie });
      });
    return () => {
      live = false;
    };
  }, [slug]);
  return found?.slug === slug ? (found?.movie ?? null) : null;
}

function findEpisode(movie: Movie, server: number, slug: string): Pick | null {
  const wanted = movie.servers[server]?.episodes.find((e) => e.slug === slug);
  if (wanted) return { server, episode: wanted };
  for (const [index, candidate] of movie.servers.entries()) {
    const episode = candidate.episodes.find((e) => e.slug === slug);
    if (episode) return { server: index, episode };
  }
  const first = movie.servers[0]?.episodes[0];
  return first ? { server: 0, episode: first } : null;
}

/** Names are "1", "2"… for series but words like "FULL" for single films. */
const episodeTitle = (name: string) =>
  /^\d/.test(name) ? `Tập ${name}` : name;

export default function CinemaPanel({
  screening,
  self,
  chat,
  onShow,
  onStop,
}: {
  screening: Screening | null;
  self: string;
  chat: (onClose: () => void) => ReactNode;
  onShow: (slug: string, server: number, episode: string) => void;
  onStop: () => void;
}) {
  const [source, setSource] = useState<Source>({ path: shelves[0].path });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Movie | null>(null);
  const [server, setServer] = useState(0);
  const [playing, setPlaying] = useState<Pick | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const showing = useScreeningMovie(screening);
  const isHost = screening?.host === self;
  const player = useRef<HTMLIFrameElement>(null);
  const playingEmbed = playing?.episode.embed;

  // Episodes sit below the player: bring the picture back into view on a phone.
  useEffect(() => {
    if (playingEmbed) player.current?.scrollIntoView({ block: "center" });
  }, [playingEmbed]);

  useEffect(() => {
    let live = true;
    const request =
      "keyword" in source
        ? searchMovies(source.keyword, page)
        : listMovies(source.path, page);
    request
      .then((result) => {
        if (!live) return;
        setMovies((current) => {
          const known = new Set(current.map((movie) => movie.slug));
          return page === 1
            ? result.movies
            : [...current, ...result.movies.filter((m) => !known.has(m.slug))];
        });
        setTotalPages(result.totalPages);
        setError("");
        setLoading(false);
      })
      .catch((reason: Error) => {
        if (!live) return;
        setError(
          reason.name === "TimeoutError"
            ? "Nguồn phim phản hồi quá lâu."
            : reason.message,
        );
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [source, page, attempt]);

  const browse = (next: Source) => {
    setSource(next);
    setPage(1);
    setMovies([]);
    setError("");
    setLoading(true);
  };
  const openMovie = (movie: Movie, pick: Pick | null = null) => {
    setSelected(movie);
    setServer(pick?.server ?? 0);
    setPlaying(pick);
  };
  const play = (movie: Movie, pick: Pick) => {
    setPlaying(pick);
    if (isHost) onShow(movie.slug, pick.server, pick.episode.slug);
  };

  if (selected) {
    const movie = selected;
    const episodes = movie.servers[server]?.episodes ?? [];
    return (
      <div>
        <button
          className={`${quiet} mb-3`}
          onClick={() => {
            if (playing) setPlaying(null);
            else setSelected(null);
          }}
        >
          <ArrowLeft size={16} />
          {playing ? "Thông tin phim" : "Danh sách phim"}
        </button>
        {playing ? (
          <div
            className={`grid gap-3 ${chatOpen ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}
          >
            <div className="min-w-0">
              <iframe
                key={playing.episode.embed}
                ref={player}
                src={playing.episode.embed}
                title={`Trình phát ${movie.name}`}
                className="aspect-video max-h-[72dvh] w-full rounded-sm border-0 bg-black"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                // The source's firewall rejects player requests with no referrer.
                referrerPolicy="origin"
                // The player carries ads: no popups, and it cannot redirect this page.
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
              />
              <h3 className="mt-2 font-bold text-[#ededed]">
                {movie.name} · {episodeTitle(playing.episode.name)}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {!screening ? (
                  <button
                    className="min-h-10 rounded-sm bg-blue-500 px-3 text-sm font-semibold text-white"
                    onClick={() =>
                      onShow(movie.slug, playing.server, playing.episode.slug)
                    }
                  >
                    Chiếu cho cả sảnh
                  </button>
                ) : isHost ? (
                  <button className={quiet} onClick={onStop}>
                    Dừng chiếu cho sảnh
                  </button>
                ) : null}
                <button
                  className={quiet}
                  aria-pressed={chatOpen}
                  onClick={() => setChatOpen(!chatOpen)}
                >
                  <MessageCircle size={16} />
                  {chatOpen ? "Ẩn trò chuyện" : "Trò chuyện"}
                </button>
                <a
                  className={quiet}
                  href={playing.episode.embed}
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink size={16} />
                  Mở ở tab mới
                </a>
              </div>
              <p className="mt-2 text-xs text-[#969696]">
                {screening && !isHost
                  ? `${screening.hostName} đang mở suất chiếu cho sảnh. `
                  : ""}
                Mỗi người tự bấm phát nên thời gian có thể lệch nhau.
              </p>
            </div>
            {chatOpen && (
              <div className="min-w-0 [&_[role=log]]:max-h-[38dvh]! [&>section]:w-full!">
                {chat(() => setChatOpen(false))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4">
            {movie.poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movie.poster}
                alt=""
                className="hidden aspect-[2/3] w-40 shrink-0 rounded-sm bg-[#1c1c1c] object-cover sm:block"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#ededed]">{movie.name}</h3>
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
        )}
        {movie.servers.length > 1 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {movie.servers.map((item, index) => (
              <button
                key={`${item.name}-${index}`}
                className={`${chip} ${index === server ? chipOn : chipOff}`}
                aria-pressed={index === server}
                onClick={() => setServer(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
        {episodes.length > 0 ? (
          <div className="mt-3 grid max-h-44 grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5 overflow-y-auto">
            {episodes.map((episode) => (
              <button
                key={episode.slug}
                aria-label={`Xem tập ${episode.name}`}
                aria-current={
                  playing?.server === server &&
                  playing.episode.slug === episode.slug
                }
                className={`${chip} ${playing?.server === server && playing.episode.slug === episode.slug ? chipOn : chipOff}`}
                onClick={() => play(movie, { server, episode })}
              >
                {episode.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#969696]">Phim này chưa có tập nào.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {screening && showing && (
        <section className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-blue-500/50 bg-[#181818] p-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-blue-400">
              Đang chiếu trong sảnh
            </p>
            <p className="truncate font-semibold text-[#ededed]">
              {showing.name}
            </p>
            <p className="text-xs text-[#969696]">
              {isHost ? "Do bạn mở" : `Do ${screening.hostName} mở`}
            </p>
          </div>
          <button
            className="min-h-10 rounded-sm bg-blue-500 px-3 text-sm font-semibold text-white"
            onClick={() =>
              openMovie(
                showing,
                findEpisode(showing, screening.server, screening.episode),
              )
            }
          >
            Xem cùng
          </button>
        </section>
      )}
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const keyword = query.trim();
          if (keyword) browse({ keyword });
        }}
      >
        <input
          aria-label="Tìm phim"
          value={query}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tên phim hoặc tên gốc…"
          className="h-10 min-w-0 flex-1 rounded-sm border border-[#303030] bg-[#101010] px-3 text-base placeholder:text-[#858585] focus:border-blue-500 md:text-sm"
        />
        <button
          aria-label="Tìm"
          className="flex h-10 w-11 items-center justify-center rounded-sm bg-blue-500 text-white"
        >
          <Search size={18} />
        </button>
      </form>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {shelves.map((shelf) => {
          const active = "path" in source && source.path === shelf.path;
          return (
            <button
              key={shelf.path}
              className={`${chip} ${active ? chipOn : chipOff}`}
              aria-pressed={active}
              onClick={() => {
                setQuery("");
                browse({ path: shelf.path });
              }}
            >
              {shelf.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="mt-6 text-center">
          <p role="alert" className="text-sm text-[#dedede]">
            {error}
          </p>
          <button
            className={`${quiet} mt-3`}
            onClick={() => {
              setError("");
              setLoading(true);
              setAttempt(attempt + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      ) : !loading && !movies.length ? (
        <p className="mt-6 text-center text-sm text-[#969696]">
          Không tìm thấy phim phù hợp.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(136px,1fr))]">
          {movies.map((movie) => (
            <button
              key={movie.slug}
              aria-label={`Xem phim ${movie.name}`}
              className="group min-w-0 self-start text-left"
              onClick={() => openMovie(movie)}
            >
              <span className="relative block aspect-[2/3] overflow-hidden rounded-sm border border-[#292929] bg-[#1c1c1c] group-hover:border-blue-500">
                {movie.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={movie.poster}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                {movie.status && (
                  <span className="absolute left-1 top-1 max-w-[calc(100%-8px)] truncate rounded-sm bg-black/80 px-1.5 py-0.5 text-[10px] text-[#ededed]">
                    {movie.status}
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-2 block text-[13px] font-semibold leading-snug text-[#dedede]">
                {movie.name}
              </span>
              {movie.year && (
                <span className="text-xs text-[#858585]">{movie.year}</span>
              )}
            </button>
          ))}
          {loading &&
            Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                aria-hidden
                className="aspect-[2/3] animate-pulse rounded-sm bg-[#1c1c1c]"
              />
            ))}
        </div>
      )}
      {!loading && !error && movies.length > 0 && page < totalPages && (
        <div className="mt-4 text-center">
          <button
            className={quiet}
            onClick={() => {
              setLoading(true);
              setPage(page + 1);
            }}
          >
            Xem thêm
          </button>
        </div>
      )}
      <p className="mt-4 text-[11px] text-[#858585]">
        Phim và trình phát do phim.nguonc.com cung cấp, có thể kèm quảng cáo.
        Z4rum không lưu trữ phim. Phim 18+ đã được ẩn.
      </p>
    </div>
  );
}
