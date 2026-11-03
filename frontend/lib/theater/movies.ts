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
  { key: "cinema", label: "Chiếu rạp" },
  { key: "tv", label: "TV Shows" },
] as const;
/** Shelves the backup has no list for. */
export const primaryOnlyShelves: readonly ShelfKey[] = ["cinema"];
export type ShelfKey = (typeof shelves)[number]["key"];
// Slugs are the primary source's. 18+ is left out here and is filtered from results as well.
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
  ["vo-thuat", "Võ Thuật"],
  ["than-thoai", "Thần Thoại"],
  ["bi-an", "Bí Ẩn"],
  ["chinh-kich", "Chính Kịch"],
  ["hoc-duong", "Học Đường"],
  ["khoa-hoc", "Khoa Học"],
  ["lich-su", "Lịch Sử"],
  ["tai-lieu", "Tài Liệu"],
  ["tre-em", "Trẻ Em"],
  ["am-nhac", "Âm Nhạc"],
  ["the-thao", "Thể Thao"],
  ["kinh-dien", "Kinh Điển"],
  ["mien-tay", "Miền Tây"],
  ["phim-ngan", "Phim Ngắn"],
] as const;
export const countries = [
  ["au-my", "Âu Mỹ"],
  ["han-quoc", "Hàn Quốc"],
  ["trung-quoc", "Trung Quốc"],
  ["nhat-ban", "Nhật Bản"],
  ["thai-lan", "Thái Lan"],
  ["viet-nam", "Việt Nam"],
  ["dai-loan", "Đài Loan"],
  ["hong-kong", "Hồng Kông"],
  ["an-do", "Ấn Độ"],
  ["anh", "Anh"],
  ["phap", "Pháp"],
  ["duc", "Đức"],
  ["nga", "Nga"],
  ["y", "Ý"],
  ["tay-ban-nha", "Tây Ban Nha"],
  ["canada", "Canada"],
  ["uc", "Úc"],
  ["tho-nhi-ky", "Thổ Nhĩ Kỳ"],
  ["indonesia", "Indonesia"],
  ["philippines", "Philippines"],
  ["malaysia", "Malaysia"],
  ["quoc-gia-khac", "Quốc gia khác"],
] as const;
export const languages = [
  ["vietsub", "Vietsub"],
  ["thuyet-minh", "Thuyết Minh"],
  ["long-tieng", "Lồng Tiếng"],
] as const;
export const sorts = [
  ["_id", "Mới thêm"],
  ["year", "Năm phát hành"],
] as const;
export const YEARS_BACK = 10;
// The primary source also takes a range; older films are too many to list year by year.
export const yearRanges = [
  ["2010,2015", "2010–2015"],
  ["2000,2009", "2000–2009"],
  ["1911,1999", "Trước 2000"],
] as const;
export type MovieFilters = {
  genre?: string;
  country?: string;
  year?: string;
  language?: string;
  sort?: string;
};
const FILTER_ORDER = ["genre", "country", "year"] as const;
/** Lists the backup answers with a 404. The live check fails if this goes out of date. */
export const backupLacks: ReadonlySet<string> = new Set([
  "vo-thuat",
  "than-thoai",
  "hoc-duong",
  "khoa-hoc",
  "tre-em",
  "the-thao",
  "kinh-dien",
  "phim-ngan",
  "y",
  "malaysia",
]);
/** The backup lists by one thing at a time and knows no language, sort or year range. */
export function backupFilters(filters: MovieFilters): MovieFilters {
  for (const kind of FILTER_ORDER) {
    const value = filters[kind];
    if (value && !value.includes(",") && !backupLacks.has(value))
      return { [kind]: value };
  }
  return {};
}

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
  quality?: string;
  language?: string;
  /** TMDB's score out of 10, or 0 when too few people voted. */
  rating?: number;
  /** Other titles, used to match searches and find the film on the other source. */
  altNames?: string[];
};
export type Movie = MovieCard & {
  quality: string;
  language: string;
  time: string;
  description: string;
  genres: string[];
  countries: string[];
  directors: string[];
  actors: string[];
  /** A YouTube link, or empty. */
  trailer: string;
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
const MAX_ALT_NAMES = 8;
const MAX_ACTORS = 8;
const MIN_VOTES = 5;
const people = (value: unknown) =>
  (Array.isArray(value) ? value : text(value).split(","))
    .map(text)
    .filter((name) => name && !/^(đang cập nhật|updating)$/i.test(name));
const phimapiRating = (raw: Raw) => {
  const tmdb = (raw.tmdb ?? {}) as Raw;
  const score = Number(tmdb.vote_average);
  return Number(tmdb.vote_count) >= MIN_VOTES && score > 0 && score <= 10
    ? score
    : 0;
};
const youtube = (value: unknown) => {
  const url = https(value);
  return /^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\//.test(url) ? url : "";
};
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
    quality: text(raw.quality),
    language: text(raw.lang),
    rating: phimapiRating(raw),
    altNames: Array.isArray(raw.alternative_names)
      ? raw.alternative_names.map(text).filter(Boolean).slice(0, MAX_ALT_NAMES)
      : [],
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
    countries: list(raw.country).map((item) => text(item.name)),
    directors: people(raw.director),
    actors: people(raw.actor).slice(0, MAX_ACTORS),
    trailer: youtube(raw.trailer_url),
    servers: list(data.episodes)
      .map((server) => ({
        // Some versions are voiced by AI; viewers should know before choosing.
        name: `${text(server.server_name)}${server.is_ai === true ? " (AI)" : ""}`,
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
    countries: list(
      groups.find((group) => /quốc gia/i.test(text((group?.group as Raw)?.name)))
        ?.list,
    ).map((item) => text(item.name)),
    directors: people(raw.director),
    actors: people(raw.casts).slice(0, MAX_ACTORS),
    trailer: "",
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
const phimapiType: Record<ShelfKey, string> = {
  latest: "",
  single: "/phim-le",
  series: "/phim-bo",
  anime: "/hoat-hinh",
  cinema: "/phim-chieu-rap",
  tv: "/tv-shows",
};
function phimapiQuery(filters: MovieFilters, at: number) {
  const query = new URLSearchParams({ limit: "24", page: String(at) });
  if (filters.genre) query.set("category", filters.genre);
  if (filters.country) query.set("country", filters.country);
  if (filters.year) query.set("year", filters.year);
  if (filters.language) query.set("sort_lang", filters.language);
  if (filters.sort) {
    query.set("sort_field", filters.sort);
    query.set("sort_type", "desc");
  }
  return query;
}
export function phimapiListUrl(
  shelf: ShelfKey,
  filters: MovieFilters,
  at: number,
) {
  // The newest list has its own quicker form when nothing narrows it.
  if (shelf === "latest" && !Object.values(filters).some(Boolean))
    return `${PHIMAPI}/danh-sach/phim-moi-cap-nhat-v3?page=${at}`;
  return `${PHIMAPI}/v1/api/danh-sach${phimapiType[shelf]}?${phimapiQuery(filters, at)}`;
}
const nguoncShelf: Record<ShelfKey, string> = {
  latest: `${NGUONC}/films/phim-moi-cap-nhat?`,
  single: `${NGUONC}/films/danh-sach/phim-le?`,
  series: `${NGUONC}/films/danh-sach/phim-bo?`,
  anime: `${NGUONC}/films/danh-sach/hoat-hinh?`,
  cinema: `${NGUONC}/films/phim-moi-cap-nhat?`, // Hidden: the backup has no such list.
  tv: `${NGUONC}/films/danh-sach/tv-shows?`,
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

// Where the backup names the same list differently.
const nguoncPath = { genre: "the-loai", country: "quoc-gia", year: "nam-phat-hanh" };
const nguoncSlug: Record<string, string> = {
  "hai-huoc": "phim-hai",
  "vien-tuong": "khoa-hoc-vien-tuong",
  "au-my": "my",
  "am-nhac": "phim-nhac",
};
export function nguoncListUrl(
  shelf: ShelfKey,
  filters: MovieFilters,
  at: number,
) {
  for (const kind of FILTER_ORDER) {
    const value = backupFilters(filters)[kind];
    if (value)
      return `${NGUONC}/films/${nguoncPath[kind]}/${encodeURIComponent(nguoncSlug[value] ?? value)}?page=${at}`;
  }
  return `${nguoncShelf[shelf]}page=${at}`;
}
export function listMovies(
  source: MovieSource,
  shelf: ShelfKey,
  at: number,
  filters: MovieFilters = {},
) {
  if (source === "phimapi") {
    const url = phimapiListUrl(shelf, filters, at);
    return cachedPage(url, () => phimapiPage(url));
  }
  const url = nguoncListUrl(shelf, filters, at);
  return cachedPage(url, () => nguoncPage(url));
}
export const searchMovies = (
  source: MovieSource,
  keyword: string,
  at: number,
  filters: MovieFilters = {},
) => {
  const query = encodeURIComponent(keyword);
  if (source === "nguonc")
    return nguoncPage(`${NGUONC}/films/search?keyword=${query}&page=${at}`);
  // A search has its own order: best title first.
  const narrowed = phimapiQuery({ ...filters, sort: undefined }, at);
  return phimapiPage(`${PHIMAPI}/v1/api/tim-kiem?keyword=${query}&${narrowed}`);
};

const FEW_RESULTS = 8;
/** Best title first. When the first page finds little, shorter wording widens it. */
export async function smartSearch(
  source: MovieSource,
  keyword: string,
  at: number,
  filters: MovieFilters = {},
): Promise<MoviePage> {
  const result = await searchMovies(source, keyword, at, filters);
  if (at > 1) return result;
  let movies = result.movies;
  // The backup checks every film it lists, so widening there costs dozens of requests.
  if (source === "phimapi" && movies.length < FEW_RESULTS) {
    const wider = await Promise.allSettled(
      fallbackQueries(keyword).map((query) =>
        searchMovies(source, query, 1, filters),
      ),
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
    [movie.name, ...movie.originalName.split(","), ...(movie.altNames ?? [])]
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
