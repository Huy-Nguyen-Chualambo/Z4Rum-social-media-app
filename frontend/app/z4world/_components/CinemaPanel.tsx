"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, MessageCircle, Search } from "lucide-react";
import {
  findOnSource,
  getMovie,
  listMovies,
  matchEpisode,
  otherSource,
  PRIMARY_SOURCE,
  searchMovies,
  shelves,
  type Episode,
  type Movie,
  type MovieCard,
  type MovieSource,
  type ShelfKey,
} from "@/lib/world/movies";
import { sharedPosition } from "@/lib/world/screeningSync";
import type { Screening } from "@/lib/world/types";
import HlsPlayer, { type PlayerRole } from "./HlsPlayer";

type Browse = { shelf: ShelfKey } | { keyword: string };
type Pick = { server: number; episode: Episode };
export type CinemaSource = { source: MovieSource; chosen: boolean };
export type ShowFilm = {
  source: MovieSource;
  slug: string;
  server: number;
  episode: string;
  playing: boolean;
  position: number;
};

const SOURCE_LABEL: Record<MovieSource, string> = {
  phimapi: "Nguồn chính",
  nguonc: "Nguồn dự phòng",
};
const chip =
  "min-h-9 shrink-0 rounded-sm border px-3 text-xs font-semibold transition-colors";
const chipOn = "border-blue-500 bg-blue-500 text-white";
const chipOff = "border-[#303030] text-[#dedede] hover:bg-[#292929]";
const quiet =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-[#303030] px-3 text-sm hover:bg-[#292929] disabled:opacity-50";
const primary =
  "min-h-10 rounded-sm bg-blue-500 px-3 text-sm font-semibold text-white";

/** The film being shown in this room, if viewers here are allowed to see it. */
export function useScreeningMovie(screening: Screening | null) {
  const [found, setFound] = useState<{
    id: string;
    movie: Movie | null;
  } | null>(null);
  const id = screening ? `${screening.source}:${screening.slug}` : "";
  const source = screening?.source;
  const slug = screening?.slug;
  useEffect(() => {
    if (!source || !slug) return;
    let live = true;
    getMovie(source, slug)
      .then((movie) => (movie.adult ? null : movie))
      .catch(() => null)
      .then((movie) => {
        if (live) setFound({ id: `${source}:${slug}`, movie });
      });
    return () => {
      live = false;
    };
  }, [source, slug]);
  return found?.id === id ? (found?.movie ?? null) : null;
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

/** Names are "1", "Tập 01"… for series but words like "FULL" for single films. */
const episodeTitle = (name: string) =>
  /^\d/.test(name) ? `Tập ${name}` : name;

export default function CinemaPanel({
  screening,
  self,
  chat,
  choice,
  onChoice,
  onShow,
  onSync,
  onStop,
}: {
  screening: Screening | null;
  self: string;
  chat: (onClose: () => void) => ReactNode;
  choice: CinemaSource;
  onChoice: (value: CinemaSource) => void;
  onShow: (film: ShowFilm) => void;
  onSync: (playing: boolean, position: number) => void;
  onStop: () => void;
}) {
  const { source, chosen } = choice;
  const [browsing, setBrowsing] = useState<Browse>({ shelf: "latest" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [movies, setMovies] = useState<MovieCard[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [server, setServer] = useState(0);
  const [playing, setPlaying] = useState<Pick | null>(null);
  const [following, setFollowing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const live = useRef({ playing: false, position: 0 });
  const showing = useScreeningMovie(screening);
  const isHost = screening?.host === self;

  // Adjusted while rendering, so the player never runs a frame in the old mode.
  if (following && !screening) {
    setFollowing(false);
    setNotice("Suất chiếu đã kết thúc.");
  }
  // A viewer stays with the host when they change film or episode.
  const followed = following && screening && showing;
  const movie = followed ? showing : selected;
  const pick = followed
    ? findEpisode(showing, screening.server, screening.episode)
    : playing;
  const here =
    screening &&
    movie &&
    pick &&
    screening.source === movie.source &&
    screening.slug === movie.slug &&
    screening.server === pick.server &&
    screening.episode === pick.episode.slug;
  const role: PlayerRole = !here
    ? "solo"
    : isHost
      ? "host"
      : following
        ? "follower"
        : "solo";

  useEffect(() => {
    let active = true;
    const request =
      "keyword" in browsing
        ? searchMovies(source, browsing.keyword, page)
        : listMovies(source, browsing.shelf, page);
    request
      .then((result) => {
        if (!active) return;
        setMovies((current) => {
          const known = new Set(current.map((item) => item.slug));
          return page === 1
            ? result.movies
            : [...current, ...result.movies.filter((m) => !known.has(m.slug))];
        });
        setTotalPages(result.totalPages);
        setError("");
        setLoading(false);
      })
      .catch((reason: Error) => {
        if (!active) return;
        // The backup takes over by itself, unless the viewer picked this source.
        if (source === PRIMARY_SOURCE && !chosen) {
          setPage(1);
          setMovies([]);
          setNotice(
            "Nguồn chính đang lỗi hoặc quá chậm nên rạp đã chuyển sang nguồn dự phòng, nguồn này không đồng bộ được khi chiếu cho sảnh. Bấm “Nguồn chính” để thử lại.",
          );
          onChoice({ source: otherSource(source), chosen: false });
          return;
        }
        setError(
          reason.name === "TimeoutError"
            ? "Nguồn phim phản hồi quá lâu."
            : reason.message,
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // onChoice comes from the page and only matters when a request fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, chosen, browsing, page, attempt]);

  const browse = (next: Browse) => {
    setBrowsing(next);
    setPage(1);
    setMovies([]);
    setError("");
    setLoading(true);
  };
  const chooseSource = (next: MovieSource) => {
    if (next === source) return;
    setNotice("");
    onChoice({ source: next, chosen: true });
    setPage(1);
    setMovies([]);
    setError("");
    setLoading(true);
  };
  const leavePlayer = () => {
    setFollowing(false);
    setPlaying(null);
  };
  const openCard = async (card: MovieCard) => {
    setOpening(true);
    setNotice("");
    try {
      const film = await getMovie(card.source, card.slug).catch(() =>
        findOnSource(card, otherSource(card.source)).then((other) => {
          if (other)
            setNotice(`Không mở được ở ${SOURCE_LABEL[card.source].toLowerCase()} nên đã chuyển sang nguồn còn lại.`);
          return other;
        }),
      );
      if (film && !film.adult) {
        setSelected(film);
        setServer(0);
        setPlaying(null);
      } else setNotice("Không mở được phim này. Hãy chọn phim khác.");
    } catch {
      setNotice("Không mở được phim này. Hãy chọn phim khác.");
    } finally {
      setOpening(false);
    }
  };
  const play = (film: Movie, next: Pick) => {
    setFollowing(false);
    setSelected(film);
    setServer(next.server);
    setPlaying(next);
    live.current = { playing: false, position: 0 };
    if (isHost)
      onShow({
        source: film.source,
        slug: film.slug,
        server: next.server,
        episode: next.episode.slug,
        playing: true,
        position: 0,
      });
  };
  /** Moves to the same film on the other source; true when it exists there. */
  const switchSource = async (film: Movie, current: Pick | null) => {
    setSwitching(true);
    const target = otherSource(film.source);
    try {
      const other = await findOnSource(film, target);
      if (!other) return false;
      setFollowing(false);
      setSelected(other);
      onChoice({ source: target, chosen: true });
      setPage(1);
      setMovies([]);
      setLoading(true);
      const next = current ? matchEpisode(other, current.episode.name) : null;
      setServer(next?.server ?? 0);
      if (next) play(other, next);
      else setPlaying(null);
      return true;
    } catch {
      return false;
    } finally {
      setSwitching(false);
    }
  };
  const onFatal = async () => {
    if (!movie) return;
    setNotice("Không phát được tập này. Đang tìm ở nguồn còn lại…");
    const moved = await switchSource(movie, pick);
    setNotice(
      moved
        ? "Nguồn này lỗi khi phát nên rạp đã chuyển sang nguồn còn lại."
        : "Không phát được tập này và nguồn còn lại không có phim này.",
    );
    if (!moved) leavePlayer();
  };

  const noticeBar = notice && (
    <p
      role="status"
      className="mb-3 rounded-sm border border-[#303030] bg-[#181818] px-3 py-2 text-sm text-[#dedede]"
    >
      {notice}
    </p>
  );

  if (movie) {
    const episodes = movie.servers[server]?.episodes ?? [];
    const canSync = Boolean(pick?.episode.stream);
    return (
      <div>
        {noticeBar}
        <button
          className={`${quiet} mb-3`}
          onClick={() => {
            if (pick) leavePlayer();
            else setSelected(null);
          }}
        >
          <ArrowLeft size={16} />
          {pick ? "Thông tin phim" : "Danh sách phim"}
        </button>
        {pick ? (
          <div
            className={`grid gap-3 ${chatOpen ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}
          >
            <div className="min-w-0">
              {pick.episode.stream ? (
                <HlsPlayer
                  src={pick.episode.stream}
                  title={`Trình phát ${movie.name}`}
                  role={role}
                  shared={screening}
                  startAt={
                    screening && here
                      ? sharedPosition(screening, Date.now())
                      : 0
                  }
                  onReport={onSync}
                  onProgress={(isPlaying, position) => {
                    live.current = { playing: isPlaying, position };
                  }}
                  onDiverge={() => {
                    setSelected(movie);
                    setPlaying(pick);
                    setServer(pick.server);
                    setFollowing(false);
                  }}
                  onFatal={onFatal}
                />
              ) : (
                <iframe
                  key={pick.episode.embed}
                  src={pick.episode.embed}
                  title={`Trình phát ${movie.name}`}
                  className="aspect-video max-h-[72dvh] w-full rounded-sm border-0 bg-black"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  // The source's firewall rejects player requests with no referrer.
                  referrerPolicy="origin"
                  // The player carries ads: no popups, and it cannot redirect this page.
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                />
              )}
              <h3 className="mt-2 font-bold text-[#ededed]">
                {movie.name} · {episodeTitle(pick.episode.name)}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {!screening ? (
                  <button
                    className={primary}
                    onClick={() =>
                      onShow({
                        source: movie.source,
                        slug: movie.slug,
                        server: pick.server,
                        episode: pick.episode.slug,
                        playing: live.current.playing,
                        position: live.current.position,
                      })
                    }
                  >
                    Chiếu cho cả sảnh
                  </button>
                ) : isHost ? (
                  <button className={quiet} onClick={onStop}>
                    Dừng chiếu cho sảnh
                  </button>
                ) : here && !following && canSync ? (
                  <button
                    className={primary}
                    onClick={() => setFollowing(true)}
                  >
                    Theo lại người chiếu
                  </button>
                ) : null}
                <button
                  className={quiet}
                  disabled={switching}
                  onClick={async () => {
                    if (!(await switchSource(movie, pick)))
                      setNotice("Nguồn còn lại không có phim này.");
                    else setNotice("");
                  }}
                >
                  {switching
                    ? "Đang đổi nguồn…"
                    : `Đổi sang ${SOURCE_LABEL[otherSource(movie.source)].toLowerCase()}`}
                </button>
                <button
                  className={quiet}
                  aria-pressed={chatOpen}
                  onClick={() => setChatOpen(!chatOpen)}
                >
                  <MessageCircle size={16} />
                  {chatOpen ? "Ẩn trò chuyện" : "Trò chuyện"}
                </button>
                {!canSync && (
                  <a
                    className={quiet}
                    href={pick.episode.embed}
                    target="_blank"
                    rel="noopener"
                  >
                    <ExternalLink size={16} />
                    Mở ở tab mới
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-[#969696]">
                {!canSync
                  ? "Nguồn này không đồng bộ được: mỗi người tự bấm phát nên thời gian có thể lệch nhau."
                  : role === "host"
                    ? "Bạn đang chiếu: bạn phát, dừng hay tua thì cả sảnh làm theo."
                    : role === "follower"
                      ? `Đang xem theo ${screening?.hostName}. Tự dừng hoặc tua sẽ tách khỏi suất chiếu.`
                      : here
                        ? "Bạn đã tách khỏi suất chiếu."
                        : "Chiếu cho cả sảnh để mọi người xem cùng một đoạn với bạn."}
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
          <div className="mt-3 grid max-h-44 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5 overflow-y-auto">
            {episodes.map((episode) => {
              const current =
                pick?.server === server && pick.episode.slug === episode.slug;
              return (
                <button
                  key={episode.slug}
                  aria-label={`Xem ${episodeTitle(episode.name)}`}
                  aria-current={current}
                  className={`${chip} ${current ? chipOn : chipOff}`}
                  onClick={() => play(movie, { server, episode })}
                >
                  {episode.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-[#969696]">Phim này chưa có tập nào.</p>
            <button
              className={`${quiet} mt-2`}
              disabled={switching}
              onClick={async () => {
                if (!(await switchSource(movie, null)))
                  setNotice("Nguồn còn lại không có phim này.");
              }}
            >
              Tìm ở {SOURCE_LABEL[otherSource(movie.source)].toLowerCase()}
            </button>
          </div>
        )}
      </div>
    );
  }

  const sourceSwitch = (
    <button
      className={`${quiet} mt-3`}
      onClick={() => chooseSource(otherSource(source))}
    >
      Dùng {SOURCE_LABEL[otherSource(source)].toLowerCase()}
    </button>
  );

  return (
    <div>
      {noticeBar}
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
            className={primary}
            onClick={() => {
              setNotice("");
              if (isHost) {
                setSelected(showing);
                setServer(screening.server);
                setPlaying(
                  findEpisode(showing, screening.server, screening.episode),
                );
              } else setFollowing(true);
            }}
          >
            {isHost ? "Tiếp tục chiếu" : "Xem cùng"}
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
          {shelves.map((shelf) => {
            const active = "shelf" in browsing && browsing.shelf === shelf.key;
            return (
              <button
                key={shelf.key}
                className={`${chip} ${active ? chipOn : chipOff}`}
                aria-pressed={active}
                onClick={() => {
                  setQuery("");
                  browse({ shelf: shelf.key });
                }}
              >
                {shelf.label}
              </button>
            );
          })}
        </div>
        <div
          role="group"
          aria-label="Nguồn phim"
          className="flex shrink-0 gap-1.5 pb-1"
        >
          {(Object.keys(SOURCE_LABEL) as MovieSource[]).map((item) => (
            <button
              key={item}
              className={`${chip} ${item === source ? "border-[#858585] bg-[#292929] text-white" : chipOff}`}
              aria-pressed={item === source}
              onClick={() => chooseSource(item)}
            >
              {SOURCE_LABEL[item]}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="mt-6 text-center">
          <p role="alert" className="text-sm text-[#dedede]">
            {error}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
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
            {sourceSwitch}
          </div>
        </div>
      ) : !loading && !movies.length ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-[#969696]">Không tìm thấy phim phù hợp.</p>
          {sourceSwitch}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(136px,1fr))]">
          {movies.map((card) => (
            <button
              key={card.slug}
              aria-label={`Xem phim ${card.name}`}
              disabled={opening}
              className="group min-w-0 self-start text-left disabled:opacity-60"
              onClick={() => openCard(card)}
            >
              <span className="relative block aspect-[2/3] overflow-hidden rounded-sm border border-[#292929] bg-[#1c1c1c] group-hover:border-blue-500">
                {card.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.poster}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                {card.status && (
                  <span className="absolute left-1 top-1 max-w-[calc(100%-8px)] truncate rounded-sm bg-black/80 px-1.5 py-0.5 text-[10px] text-[#ededed]">
                    {card.status}
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-2 block text-[13px] font-semibold leading-snug text-[#dedede]">
                {card.name}
              </span>
              {card.year && (
                <span className="text-xs text-[#858585]">{card.year}</span>
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
        Phim do phimapi.com và phim.nguonc.com cung cấp, có thể kèm quảng cáo.
        Z4rum không lưu trữ phim. Phim 18+ đã được ẩn.
      </p>
    </div>
  );
}
