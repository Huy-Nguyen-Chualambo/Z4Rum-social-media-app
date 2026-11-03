"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  ExternalLink,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import {
  findOnSource,
  getMovie,
  matchEpisode,
  otherSource,
  type Movie,
} from "@/lib/theater/movies";
import { recordWatched } from "@/lib/theater/library";
import { sharedPosition } from "@/lib/theater/screeningSync";
import type { Screening } from "@/lib/theater/types";
import HlsPlayer, { type PlayerRole } from "./HlsPlayer";
import MovieBrowser, { quiet, SOURCE_LABEL } from "./MovieBrowser";
import MovieDetail, {
  EpisodeList,
  episodeTitle,
  type EpisodePick,
} from "./MovieDetail";
import SaveButton from "./SaveButton";
import TheaterChat from "./TheaterChat";
import TheaterDialog from "./TheaterDialog";
import { usePickMovie } from "./usePickMovie";

const primary =
  "min-h-10 rounded-sm bg-blue-500 px-3 text-sm font-semibold text-white";
type Own = { movie: Movie; pick: EpisodePick };
const REMEMBER_EVERY_MS = 5_000;

function findEpisode(
  movie: Movie,
  server: number,
  slug: string,
): EpisodePick | null {
  const wanted = movie.servers[server]?.episodes.find((e) => e.slug === slug);
  if (wanted) return { server, episode: wanted };
  for (const [index, candidate] of movie.servers.entries()) {
    const episode = candidate.episodes.find((e) => e.slug === slug);
    if (episode) return { server: index, episode };
  }
  const first = movie.servers[0]?.episodes[0];
  return first ? { server: 0, episode: first } : null;
}

export default function TheaterScreen({
  room,
  loginNext,
  initialNotice = "",
}: {
  room: Screening;
  /** Where logging in should bring this viewer back to. */
  loginNext: (position: number) => string;
  initialNotice?: string;
}) {
  const router = useRouter();
  const { playback, isHost, members, self, guest, solo } = room;
  const [found, setFound] = useState<{ id: string; movie: Movie | null } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const filmId = playback ? `${playback.source}:${playback.slug}:${attempt}` : "";
  const source = playback?.source;
  const slug = playback?.slug;
  useEffect(() => {
    if (!source || !slug) return;
    let live = true;
    const id = `${source}:${slug}:${attempt}`;
    getMovie(source, slug)
      .then((movie) => (movie.adult ? null : movie))
      .catch(() => null)
      .then((movie) => {
        if (live) setFound({ id, movie });
      });
    return () => {
      live = false;
    };
  }, [source, slug, attempt]);
  const shared = found?.id === filmId ? found.movie : null;
  const failed = found?.id === filmId && !found.movie;

  // A viewer may step out of the screening: pause or seek by hand, or use another source.
  const [detached, setDetached] = useState(false);
  const [own, setOwn] = useState<Own | null>(null);
  const [switching, setSwitching] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [chatOpen, setChatOpen] = useState(!solo);
  const [changing, setChanging] = useState(false);
  const [invite, setInvite] = useState("");
  const live = useRef({ playing: false, position: 0 });
  const chooser = usePickMovie();
  // Whoever stepped out rejoins when the host moves on, rather than watching it unsynced.
  const showingId = playback
    ? `${playback.source}:${playback.slug}:${playback.server}:${playback.episode}`
    : "";
  const [lastShowing, setLastShowing] = useState(showingId);
  if (showingId !== lastShowing) {
    setLastShowing(showingId);
    setDetached(false);
  }
  const viewingOwn = !isHost && own;
  const movie = viewingOwn ? own.movie : shared;
  const pick = viewingOwn
    ? own.pick
    : shared && playback
      ? findEpisode(shared, playback.server, playback.episode)
      : null;
  const canSync = Boolean(pick?.episode.stream);
  // Remembers this viewer's own place, whether they steer the room or follow it.
  const remembered = useRef(0);
  const remember = (position: number, duration: number) => {
    if (movie && pick)
      recordWatched(
        movie,
        {
          server: pick.server,
          episode: pick.episode.slug,
          episodeName: episodeTitle(pick.episode.name),
        },
        position,
        duration,
      );
  };
  const playingSlug = movie ? `${movie.source}:${movie.slug}` : "";
  const playingEpisode = pick?.episode.slug;
  useEffect(() => {
    if (playingSlug && playingEpisode) remember(live.current.position, 0);
    // Only a change of film or episode opens a new entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingSlug, playingEpisode]);
  const role: PlayerRole =
    !playback || viewingOwn
      ? "solo"
      : isHost
        ? "host"
        : detached
          ? "solo"
          : "follower";

  const play = (film: Movie, next: EpisodePick) => {
    live.current = { playing: false, position: 0 };
    setNotice("");
    room.changeFilm(
      {
        source: film.source,
        slug: film.slug,
        server: next.server,
        episode: next.episode.slug,
      },
      true,
      0,
    );
  };
  /** Moves to the same film on the other source; true when it exists there. */
  const switchSource = async () => {
    if (!movie) return false;
    setSwitching(true);
    try {
      const other = await findOnSource(movie, otherSource(movie.source));
      if (!other) return false;
      const next = pick ? matchEpisode(other, pick.episode.name) : null;
      if (!next) return false;
      if (isHost) play(other, next);
      else setOwn({ movie: other, pick: next });
      return true;
    } catch {
      return false;
    } finally {
      setSwitching(false);
    }
  };
  const onFatal = async () => {
    setNotice("Không phát được tập này. Đang tìm ở nguồn còn lại…");
    setNotice(
      (await switchSource())
        ? "Nguồn này lỗi khi phát nên đã chuyển sang nguồn còn lại."
        : "Không phát được tập này và nguồn còn lại không có phim này.",
    );
  };
  const logIn = () =>
    router.push(
      `/login?next=${encodeURIComponent(loginNext(live.current.position))}`,
    );
  const inviteFriends = async () => {
    if (guest) return logIn();
    const url = window.location.href;
    try {
      if (window.matchMedia("(pointer: coarse)").matches && navigator.share)
        await navigator.share({ title: "Xem phim cùng mình", url });
      else {
        await navigator.clipboard.writeText(url);
        setInvite("Đã chép link mời.");
      }
    } catch (reason) {
      if ((reason as Error).name !== "AbortError")
        setInvite(`Link mời: ${url}`);
    }
  };

  if (room.missing)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#101010] p-6 text-center text-[#ededed]">
        <Clapperboard size={32} className="text-[#858585]" />
        <h1 className="text-xl font-bold">Phòng này đã đóng</h1>
        <p className="max-w-sm text-sm text-[#a3a3a3]">
          Phòng tự đóng khi không còn ai xem. Bạn có thể mở phòng mới và gửi lại
          link cho bạn bè.
        </p>
        <Link href="/z4theater" className={`${primary} flex items-center`}>
          Về Z4theater
        </Link>
      </main>
    );

  return (
    <main className="flex h-dvh flex-col bg-[#101010] font-sans text-[#ededed]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#292929] px-2 py-1.5 [@media(max-height:500px)]:py-0.5">
        <Link
          href="/z4theater"
          aria-label={solo ? "Về danh sách phim" : "Rời phòng"}
          title={solo ? "Về danh sách phim" : "Rời phòng"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm hover:bg-[#292929]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold leading-tight">
            {movie ? movie.name : "Z4theater"}
            {pick ? ` · ${episodeTitle(pick.episode.name)}` : ""}
          </h1>
          <p
            className="truncate text-[11px] leading-tight text-[#969696]"
            title={members.map((m) => m.username).join(", ")}
          >
            {solo
              ? "Bạn đang xem một mình"
              : `${members.length} người trong phòng${playback && !playback.hostAway ? ` · ${playback.hostName} đang chiếu` : ""}`}
          </p>
        </div>
        <button
          className={`${primary} flex shrink-0 items-center gap-1.5 disabled:opacity-40`}
          disabled={!self}
          onClick={inviteFriends}
        >
          <UserPlus size={16} />
          Mời bạn
        </button>
      </header>
      <div
        className={`grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden ${chatOpen ? "lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1 [@media(max-height:500px)]:grid-cols-[minmax(0,1fr)_260px] [@media(max-height:500px)]:grid-rows-1" : ""}`}
      >
        <div className="min-h-0 min-w-0 overflow-y-auto">
          {pick && movie ? (
            pick.episode.stream ? (
              <HlsPlayer
                src={pick.episode.stream}
                title={`Trình phát ${movie.name}`}
                role={role}
                shared={playback}
                startAt={
                  isHost && playback
                    ? sharedPosition(playback, Date.now())
                    : 0
                }
                onReport={room.sync}
                onProgress={(playing, position, duration) => {
                  live.current = { playing, position };
                  if (Date.now() - remembered.current < REMEMBER_EVERY_MS) return;
                  remembered.current = Date.now();
                  remember(position, duration);
                }}
                onDiverge={() => setDetached(true)}
                onFatal={onFatal}
              />
            ) : (
              <iframe
                key={pick.episode.embed}
                src={pick.episode.embed}
                title={`Trình phát ${movie.name}`}
                className="block aspect-video max-h-[calc(100dvh-52px)] w-full border-0 bg-black"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                // The source's firewall rejects player requests with no referrer.
                referrerPolicy="origin"
                // The player carries ads: no popups, and it cannot redirect this page.
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
              />
            )
          ) : (
            <div className="flex aspect-video max-h-[calc(100dvh-52px)] w-full items-center justify-center bg-black px-4 text-center text-sm text-[#a3a3a3]">
              {failed ? (
                <span>
                  Không tải được phim.{" "}
                  <button
                    className="font-semibold text-blue-400 underline"
                    onClick={() => setAttempt(attempt + 1)}
                  >
                    Thử lại
                  </button>
                </span>
              ) : (
                room.problem || "Đang vào phòng…"
              )}
            </div>
          )}
          <div className="p-3">
            {(room.problem || notice || invite) && pick && (
              <p
                role="status"
                className="mb-2 break-words rounded-sm border border-[#303030] bg-[#181818] px-3 py-2 text-sm text-[#dedede]"
              >
                {room.problem || notice || invite}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {isHost && (
                <button
                  className={quiet}
                  onClick={() => {
                    chooser.clear();
                    setChanging(true);
                  }}
                >
                  <Clapperboard size={16} />
                  Đổi phim
                </button>
              )}
              {!isHost && (viewingOwn || detached) && (
                <button
                  className={primary}
                  onClick={() => {
                    setOwn(null);
                    setDetached(false);
                    setNotice("");
                  }}
                >
                  Theo lại người chiếu
                </button>
              )}
              {movie && <SaveButton film={movie} />}
              {!isHost && !viewingOwn && !detached && playback?.hostAway && (
                <button className={primary} onClick={() => setDetached(true)}>
                  Xem tiếp một mình
                </button>
              )}
              {movie && (
                <button
                  className={quiet}
                  disabled={switching}
                  onClick={async () => {
                    setNotice("");
                    if (!(await switchSource()))
                      setNotice("Nguồn còn lại không có phim này.");
                  }}
                >
                  {switching
                    ? "Đang đổi nguồn…"
                    : `Đổi sang ${SOURCE_LABEL[otherSource(movie.source)].toLowerCase()}`}
                </button>
              )}
              <button
                className={quiet}
                aria-pressed={chatOpen}
                onClick={() => setChatOpen(!chatOpen)}
              >
                <MessageCircle size={16} />
                {chatOpen ? "Ẩn trò chuyện" : "Trò chuyện"}
              </button>
              {pick && !canSync && (
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
              {!pick
                ? ""
                : solo
                  ? "Đăng nhập để mở phòng riêng, mời bạn bè và trò chuyện."
                  : !canSync
                    ? "Nguồn này không đồng bộ được: mỗi người tự bấm phát nên thời gian có thể lệch nhau."
                    : playback?.hostAway && role === "follower"
                      ? `${playback.hostName} đã rời phòng nên phim đang dừng. Bạn có thể đợi hoặc xem tiếp một mình.`
                      : role === "host"
                        ? "Bạn đang chiếu: bạn phát, dừng hay tua thì cả phòng làm theo."
                        : role === "follower"
                          ? `Đang xem theo ${playback?.hostName}. Tự dừng hoặc tua sẽ tách khỏi suất chiếu.`
                          : "Bạn đã tách khỏi suất chiếu."}
            </p>
            {isHost && movie && (
              <EpisodeList
                movie={movie}
                current={pick}
                onPlay={(next) => play(movie, next)}
              />
            )}
          </div>
        </div>
        {chatOpen && (
          <TheaterChat
            messages={room.messages}
            self={self}
            alone={members.length <= 1}
            canSend={Boolean(playback)}
            onLogin={guest ? logIn : undefined}
            onSend={room.sendChat}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
      {changing && (
        <TheaterDialog
          wide
          title={solo ? "Đổi phim" : "Đổi phim cho cả phòng"}
          onClose={() => setChanging(false)}
        >
          {chooser.notice && (
            <p role="alert" className="mb-3 text-sm text-[#dedede]">
              {chooser.notice}
            </p>
          )}
          {chooser.movie ? (
            <>
              <button className={`${quiet} mb-3`} onClick={chooser.clear}>
                <ArrowLeft size={16} />
                Danh sách phim
              </button>
              <MovieDetail
                movie={chooser.movie}
                onPlay={(next) => {
                  play(chooser.movie!, next);
                  setChanging(false);
                }}
              />
            </>
          ) : (
            <MovieBrowser busy={chooser.opening} onPick={chooser.pick} />
          )}
        </TheaterDialog>
      )}
    </main>
  );
}
