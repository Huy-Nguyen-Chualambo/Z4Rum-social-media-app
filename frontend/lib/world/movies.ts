const API = "https://phim.nguonc.com/api";
const CACHE_MS = 5 * 60_000;
const TIMEOUT_MS = 12_000;
const CHECKS_AT_ONCE = 4;

export type Episode = { name: string; slug: string; embed: string };
export type MovieServer = { name: string; episodes: Episode[] };
export type Movie = {
  slug: string;
  name: string;
  originalName: string;
  year: string;
  poster: string;
  status: string;
  quality: string;
  language: string;
  time: string;
  description: string;
  genres: string[];
  adult: boolean;
  servers: MovieServer[];
};
export type MoviePage = {
  movies: Movie[];
  page: number;
  totalPages: number;
};
export const shelves = [
  { label: "Mới cập nhật", path: "films/phim-moi-cap-nhat" },
  { label: "Phim lẻ", path: "films/danh-sach/phim-le" },
  { label: "Phim bộ", path: "films/danh-sach/phim-bo" },
  { label: "Hoạt hình", path: "films/danh-sach/hoat-hinh" },
];

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

type Raw = Record<string, unknown>;
const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? (value as Raw[]) : [];

export function toMovie(raw: Raw): Movie {
  const groups = Object.values((raw.category ?? {}) as Record<string, Raw>);
  const labels = groups.flatMap((group) =>
    list(group?.list).map((item) => text(item.name)),
  );
  const genre = groups.find((group) =>
    /thể loại/i.test(text((group?.group as Raw)?.name)),
  );
  return {
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
    // Z4world is a public room: a film we cannot classify stays hidden too.
    adult: !labels.length || labels.some((label) => /18\s*\+/.test(label)),
    servers: list(raw.episodes)
      .map((server) => ({
        name: text(server.server_name),
        episodes: list(server.items)
          .map((item) => ({
            name: text(item.name),
            slug: text(item.slug),
            embed: https(item.embed),
          }))
          .filter((episode) => episode.slug && episode.embed),
      }))
      .filter((server) => server.episodes.length),
  };
}

const cache = new Map<string, { at: number; data: Promise<Raw> }>();
function getJson(path: string): Promise<Raw> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = fetch(`${API}/${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(async (response) => {
    if (response.status === 429)
      throw new Error("Nguồn phim đang quá tải. Hãy thử lại sau ít phút.");
    if (!response.ok) throw new Error("Không tải được dữ liệu phim.");
    return (await response.json()) as Raw;
  });
  cache.set(path, { at: Date.now(), data });
  data.catch(() => cache.delete(path));
  return data;
}

export async function getMovie(slug: string): Promise<Movie> {
  const data = await getJson(`film/${encodeURIComponent(slug)}`);
  return toMovie((data.movie ?? {}) as Raw);
}

/**
 * List items carry no categories, so each film is looked up before it is shown:
 * this is the only way to keep 18+ films out, and it makes opening a film instant.
 */
async function page(path: string): Promise<MoviePage> {
  const data = await getJson(path);
  const items = list(data.items);
  const found: (Movie | null)[] = new Array(items.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: CHECKS_AT_ONCE }, async () => {
      while (next < items.length) {
        const index = next++;
        found[index] = await getMovie(text(items[index].slug)).catch(
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
      Boolean(movie && !movie.adult && movie.slug),
    ),
    page: Number(paginate.current_page) || 1,
    totalPages: Number(paginate.total_page) || 1,
  };
}
export const listMovies = (path: string, at: number) =>
  page(`${path}?page=${at}`);
export const searchMovies = (keyword: string, at: number) =>
  page(`films/search?keyword=${encodeURIComponent(keyword)}&page=${at}`);
