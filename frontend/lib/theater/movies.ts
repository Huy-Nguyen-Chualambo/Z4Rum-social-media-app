import { fallbackQueries, isCloseEnough, rankMovies } from "./movieSearch";
import { cachedPage } from "./pageCache";

const CACHE_MS = 5 * 60_000;
const TIMEOUT_MS = 10_000;
const RETRY_AFTER_MS = 2_000;
// The backup lists one lookup per film: a slow source must not get twice the traffic.
const MAX_SPARES = 3;
let sparesInUse = 0;
const CHECKS_AT_ONCE = 4;

export type MovieSource = "phimapi" | "nguonc";
export const PRIMARY_SOURCE: MovieSource = "phimapi";
export const otherSource = (source: MovieSource): MovieSource =>
  source === "phimapi" ? "nguonc" : "phimapi";
export const shelves = [
  { key: "latest", label: "Mới cập nhật" },
  { key: "single", label: "Phim lẻ" },
  { key: "series", label: "Phim bộ" },
  { key: "anime", label: "Hoạt hình" },
] as const;
export type ShelfKey = (typeof shelves)[number]["key"];
// Slugs are the primary source's. Only genres safe to offer: 18+ is never listed.
export const genres = [
  ["hanh-dong", "Hành Động"],
  ["tinh-cam", "Tình Cảm"],
  ["hai-huoc", "Hài Hước"],
  ["kinh-di", "Kinh Dị"],
  ["vien-tuong", "Viễn Tưởng"],
  ["tam-ly", "Tâm Lý"],
  ["hinh-su", "Hình Sự"],
  ["co-trang", "Cổ Trang"],
  ["phieu-luu", "Phiêu Lưu"],
  ["chien-tranh", "Chiến Tranh"],
  ["gia-dinh", "Gia Đình"],
] as const;
export const countries = [
  ["au-my", "Âu Mỹ"],
  ["han-quoc", "Hàn Quốc"],
  ["trung-quoc", "Trung Quốc"],
  ["nhat-ban", "Nhật Bản"],
  ["thai-lan", "Thái Lan"],
  ["viet-nam", "Việt Nam"],
  ["dai-loan", "Đài Loan"],
  ["an-do", "Ấn Độ"],
] as const;
export const YEARS_BACK = 10;
export type MovieFilter = { kind: "genre" | "country" | "year"; value: string };

/** `stream` is a direct HLS link we can play and sync; `embed` is a third-party page. */
export type Episode = {
  name: string;
  slug: string;
  stream: string;
  embed: string;
};
export type MovieServer = { name: string; episodes: Episode[] };
export type MovieCard = {
  source: MovieSource;
  slug: string;
  name: string;
  originalName: string;
  year: string;
  poster: string;
  status: string;
  adult: boolean;
};
export type Movie = MovieCard & {
  quality: string;
  language: string;
  time: string;
  description: string;
  genres: string[];
  servers: MovieServer[];
};
export type MoviePage = {
  movies: MovieCard[];
  page: number;
  totalPages: number;
};

type Raw = Record<string, unknown>;
const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
const https = (value: unknown) => {
  try {
    const url = new URL(text(value));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};
/** Descriptions arrive as HTML; React escapes what is left, so this is only tidying. */
const plain = (value: unknown) =>
  text(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? (value as Raw[]) : [];
// Rooms are shared with friends: a film we cannot classify stays hidden too.
const isAdult = (labels: string[]) =>
  !labels.length || labels.some((label) => /18\s*\+/.test(label));

const IMAGES = "https://phimimg.com/";
const phimapiImage = (value: unknown) =>
  https(value) ||
  (text(value) ? https(IMAGES + text(value).replace(/^\/+/, "")) : "");

function phimapiCard(raw: Raw): MovieCard {
  return {
    source: "phimapi",
    slug: text(raw.slug),
    name: text(raw.name),
    originalName: text(raw.origin_name),
    year: text(raw.year),
    poster: phimapiImage(raw.poster_url) || phimapiImage(raw.thumb_url),
    status: text(raw.episode_current),
    adult: isAdult(list(raw.category).map((item) => text(item.name))),
  };
}
export function phimapiMovie(data: Raw): Movie {
  const raw = (data.movie ?? {}) as Raw;
  const genres = list(raw.category).map((item) => text(item.name));
  return {
    ...phimapiCard(raw),
    quality: text(raw.quality),
    language: text(raw.lang),
    // The source writes " phút/tập" when it has no duration.
    time: /\d/.test(text(raw.time)) ? text(raw.time) : "",
    description: plain(raw.content),
    genres,
    servers: list(data.episodes)
      .map((server) => ({
        name: text(server.server_name),
        episodes: list(server.server_data)
          .map((item) => ({
            name: text(item.name),
            slug: text(item.slug),
            stream: https(item.link_m3u8),
            embed: https(item.link_embed),
          }))
          .filter((item) => item.slug && (item.stream || item.embed)),
      }))
      .filter((server) => server.episodes.length),
  };
}
export function nguoncMovie(data: Raw): Movie {
  const raw = (data.movie ?? {}) as Raw;
  const groups = Object.values((raw.category ?? {}) as Record<string, Raw>);
  const genre = groups.find((group) =>
    /thể loại/i.test(text((group?.group as Raw)?.name)),
  );
  return {
    source: "nguonc",
    slug: text(raw.slug),
    name: text(raw.name),
    originalName: text(raw.original_name),
    year: text(raw.year),
    poster:
      https(raw.thumb_url) ||
      https(raw.thumb_url_webp) ||
      https(raw.poster_url) ||
      https(raw.poster_url_webp),
    status: text(raw.current_episode),
    quality: text(raw.quality),
    language: text(raw.language),
    time: text(raw.time),
    description: plain(raw.description),
    genres: genre ? list(genre.list).map((item) => text(item.name)) : [],
    adult: isAdult(
      groups.flatMap((group) =>
        list(group?.list).map((item) => text(item.name)),
      ),
    ),
    servers: list(raw.episodes)
      .map((server) => ({
        name: text(server.server_name),
        episodes: list(server.items)
          .map((item) => ({
            name: text(item.name),
            slug: text(item.slug),
            stream: "",
            embed: https(item.embed),
          }))
          .filter((item) => item.slug && item.embed),
      }))
      .filter((server) => server.episodes.length),
  };
}

const cache = new Map<string, { at: number; data: Promise<Raw> }>();
async function attempt(url: string, signal: AbortSignal): Promise<Raw> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  }).catch(() => {
    throw new Error("Không kết nối được nguồn phim.");
  });
  if (response.status === 429)
    throw new Error("Nguồn phim đang quá tải. Hãy thử lại sau ít phút.");
  if (!response.ok) throw new Error("Không tải được dữ liệu phim.");
  return (await response.json()) as Raw;
}

/** Most answers take under a second but some stall for 15, so a slow one gets a second try. */
function fetchJson(url: string): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const stop = new AbortController();
    let trying = 0;
    let done = false;
    let spare = false;
    let firstError: unknown;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(second);
      clearTimeout(limit);
      if (spare) sparesInUse--;
      stop.abort();
      settle();
    };
    const start = () => {
      trying++;
      attempt(url, stop.signal).then(
        (data) => finish(() => resolve(data)),
        (reason) => {
          firstError ??= reason;
          if (--trying === 0) finish(() => reject(firstError));
        },
      );
    };
    const second = setTimeout(() => {
      if (sparesInUse >= MAX_SPARES) return;
      sparesInUse++;
      spare = true;
      start();
    }, RETRY_AFTER_MS);
    const limit = setTimeout(
      () =>
        finish(() =>
          reject(
            Object.assign(new Error("Nguồn phim phản hồi quá lâu."), {
              name: "TimeoutError",
            }),
          ),
        ),
      TIMEOUT_MS,
    );
    start();
  });
}

function getJson(url: string): Promise<Raw> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = fetchJson(url);
  cache.set(url, { at: Date.now(), data });
  data.catch(() => cache.delete(url));
  return data;
}

const PHIMAPI = "https://phimapi.com";
const NGUONC = "https://phim.nguonc.com/api";
const phimapiShelf: Record<ShelfKey, string> = {
  latest: `${PHIMAPI}/danh-sach/phim-moi-cap-nhat-v3?`,
  single: `${PHIMAPI}/v1/api/danh-sach/phim-le?limit=24&`,
  series: `${PHIMAPI}/v1/api/danh-sach/phim-bo?limit=24&`,
  anime: `${PHIMAPI}/v1/api/danh-sach/hoat-hinh?limit=24&`,
};
const nguoncShelf: Record<ShelfKey, string> = {
  latest: `${NGUONC}/films/phim-moi-cap-nhat?`,
  single: `${NGUONC}/films/danh-sach/phim-le?`,
  series: `${NGUONC}/films/danh-sach/phim-bo?`,
  anime: `${NGUONC}/films/danh-sach/hoat-hinh?`,
};

export async function getMovie(
  source: MovieSource,
  slug: string,
): Promise<Movie> {
  const id = encodeURIComponent(slug);
  const movie =
    source === "phimapi"
      ? phimapiMovie(await getJson(`${PHIMAPI}/phim/${id}`))
      : nguoncMovie(await getJson(`${NGUONC}/film/${id}`));
  if (!movie.slug) throw new Error("Không tải được dữ liệu phim.");
  return movie;
}

async function phimapiPage(url: string): Promise<MoviePage> {
  const data = await getJson(url);
  const body = (data.data ?? data) as Raw;
  if (!Array.isArray(body.items))
    throw new Error("Không tải được dữ liệu phim.");
  const paging = ((body.params as Raw)?.pagination ?? body.pagination) as
    | Raw
    | undefined;
  return {
    movies: list(body.items)
      .map(phimapiCard)
      .filter((movie) => movie.slug && !movie.adult),
    page: Number(paging?.currentPage) || 1,
    totalPages: Number(paging?.totalPages) || 1,
  };
}

/** This source's lists carry no categories, so each film is looked up before it shows. */
async function nguoncPage(url: string): Promise<MoviePage> {
  const data = await getJson(url);
  const items = list(data.items);
  const found: (Movie | null)[] = new Array(items.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: CHECKS_AT_ONCE }, async () => {
      while (next < items.length) {
        const index = next++;
        found[index] = await getMovie("nguonc", text(items[index].slug)).catch(
          () => null,
        );
      }
    }),
  );
  if (items.length && found.every((movie) => !movie))
    throw new Error("Không tải được dữ liệu phim.");
  const paginate = (data.paginate ?? {}) as Raw;
  return {
    movies: found.filter((movie): movie is Movie =>
      Boolean(movie && !movie.adult),
    ),
    page: Number(paginate.current_page) || 1,
    totalPages: Number(paginate.total_page) || 1,
  };
}

export function listMovies(source: MovieSource, shelf: ShelfKey, at: number) {
  const url = `${(source === "phimapi" ? phimapiShelf : nguoncShelf)[shelf]}page=${at}`;
  return cachedPage(url, () =>
    source === "phimapi" ? phimapiPage(url) : nguoncPage(url),
  );
}
export const searchMovies = (
  source: MovieSource,
  keyword: string,
  at: number,
) => {
  const query = encodeURIComponent(keyword);
  return source === "phimapi"
    ? phimapiPage(
        `${PHIMAPI}/v1/api/tim-kiem?keyword=${query}&limit=24&page=${at}`,
      )
    : nguoncPage(`${NGUONC}/films/search?keyword=${query}&page=${at}`);
};

const phimapiFilter = { genre: "the-loai", country: "quoc-gia", year: "nam" };
const nguoncFilter = {
  genre: "the-loai",
  country: "quoc-gia",
  year: "nam-phat-hanh",
};
// Where the backup names the same list differently.
const nguoncSlug: Record<string, string> = {
  "hai-huoc": "phim-hai",
  "vien-tuong": "khoa-hoc-vien-tuong",
  "au-my": "my",
};
export const filterMovies = (
  source: MovieSource,
  { kind, value }: MovieFilter,
  at: number,
) => {
  const id = encodeURIComponent(
    source === "nguonc" ? (nguoncSlug[value] ?? value) : value,
  );
  const url =
    source === "phimapi"
      ? `${PHIMAPI}/v1/api/${phimapiFilter[kind]}/${id}?limit=24&page=${at}`
      : `${NGUONC}/films/${nguoncFilter[kind]}/${id}?page=${at}`;
  return cachedPage(url, () =>
    source === "phimapi" ? phimapiPage(url) : nguoncPage(url),
  );
};

const FEW_RESULTS = 8;
/** Best title first. When the first page finds little, shorter wording widens it. */
export async function smartSearch(
  source: MovieSource,
  keyword: string,
  at: number,
): Promise<MoviePage> {
  const result = await searchMovies(source, keyword, at);
  if (at > 1) return result;
  let movies = result.movies;
  // The backup checks every film it lists, so widening there costs dozens of requests.
  if (source === "phimapi" && movies.length < FEW_RESULTS) {
    const wider = await Promise.allSettled(
      fallbackQueries(keyword).map((query) => searchMovies(source, query, 1)),
    );
    const known = new Set(movies.map((movie) => movie.slug));
    for (const outcome of wider) {
      if (outcome.status !== "fulfilled") continue;
      for (const movie of outcome.value.movies) {
        if (known.has(movie.slug) || !isCloseEnough(movie, keyword)) continue;
        known.add(movie.slug);
        movies = [...movies, movie];
      }
    }
  }
  return { ...result, movies: rankMovies(movies, keyword) };
}

const same = (value: string) => value.normalize("NFC").toLowerCase().trim();
function isSameFilm(a: MovieCard, b: MovieCard) {
  if (a.year && b.year && a.year !== b.year) return false;
  const names = (movie: MovieCard) =>
    [movie.name, ...movie.originalName.split(",")]
      .map(same)
      .filter(Boolean);
  const theirs = names(b);
  return names(a).some((name) => theirs.includes(name));
}

/** The same film on another source. Slugs differ, so it is matched by title and year. */
export async function findOnSource(
  film: MovieCard,
  source: MovieSource,
): Promise<Movie | null> {
  for (const keyword of [film.name, film.originalName.split(",")[0]]) {
    if (!keyword?.trim()) continue;
    const { movies } = await searchMovies(source, keyword.trim(), 1);
    const match = movies.find((movie) => isSameFilm(film, movie));
    if (match) {
      const movie = await getMovie(source, match.slug);
      return movie.adult ? null : movie;
    }
  }
  return null;
}

const episodeKey = (name: string) => {
  const number = name.match(/\d+/);
  return number ? String(Number(number[0])) : same(name);
};
/** Sources name the same episode differently: "Tập 01" and "1". */
export function matchEpisode(movie: Movie, name: string) {
  for (const [server, candidate] of movie.servers.entries()) {
    const episode = candidate.episodes.find(
      (item) => episodeKey(item.name) === episodeKey(name),
    );
    if (episode) return { server, episode };
  }
  const first = movie.servers[0]?.episodes[0];
  return first ? { server: 0, episode: first } : null;
}
