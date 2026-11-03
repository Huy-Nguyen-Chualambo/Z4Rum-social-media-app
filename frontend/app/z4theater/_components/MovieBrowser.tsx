"use client";
import { useEffect, useState } from "react";
import {
  countries,
  filterMovies,
  genres,
  listMovies,
  otherSource,
  PRIMARY_SOURCE,
  shelves,
  smartSearch,
  YEARS_BACK,
  type MovieCard,
  type MovieFilter,
  type MovieSource,
  type ShelfKey,
} from "@/lib/theater/movies";
import MovieSearchBox from "./MovieSearchBox";

type Browse = { shelf: ShelfKey } | { keyword: string } | { filter: MovieFilter };
const thisYear = new Date().getFullYear();
const filters: {
  kind: MovieFilter["kind"];
  label: string;
  options: readonly (readonly [string, string])[];
}[] = [
  { kind: "genre", label: "Thể loại", options: genres },
  { kind: "country", label: "Quốc gia", options: countries },
  {
    kind: "year",
    label: "Năm",
    options: Array.from({ length: YEARS_BACK }, (_, i) => {
      const year = String(thisYear - i);
      return [year, year] as const;
    }),
  },
];
export const SOURCE_LABEL: Record<MovieSource, string> = {
  phimapi: "Nguồn chính",
  nguonc: "Nguồn dự phòng",
};
export const chip =
  "min-h-9 shrink-0 rounded-sm border px-3 text-xs font-semibold transition-colors";
export const chipOn = "border-blue-500 bg-blue-500 text-white";
export const chipOff = "border-[#303030] text-[#dedede] hover:bg-[#292929]";
export const quiet =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-[#303030] px-3 text-sm hover:bg-[#292929] disabled:opacity-50";

/** The catalog: search, shelves and a source the viewer can change. */
export default function MovieBrowser({
  busy = false,
  onPick,
}: {
  busy?: boolean;
  onPick: (card: MovieCard) => void;
}) {
  const [source, setSource] = useState<MovieSource>(PRIMARY_SOURCE);
  const [chosen, setChosen] = useState(false);
  const [browsing, setBrowsing] = useState<Browse>({ shelf: "latest" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [movies, setMovies] = useState<MovieCard[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const request =
      "keyword" in browsing
        ? smartSearch(source, browsing.keyword, page)
        : "filter" in browsing
          ? filterMovies(source, browsing.filter, page)
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
            "Nguồn chính đang lỗi hoặc quá chậm nên rạp đã chuyển sang nguồn dự phòng, nguồn này không đồng bộ được khi xem chung. Bấm “Nguồn chính” để thử lại.",
          );
          setSource(otherSource(source));
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
    setSource(next);
    setChosen(true);
    setPage(1);
    setMovies([]);
    setError("");
    setLoading(true);
  };
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
      {notice && (
        <p
          role="status"
          className="mb-3 rounded-sm border border-[#303030] bg-[#181818] px-3 py-2 text-sm text-[#dedede]"
        >
          {notice}
        </p>
      )}
      <MovieSearchBox
        source={source}
        query={query}
        busy={busy}
        onQuery={setQuery}
        onSearch={(keyword) => browse({ keyword })}
        onPick={onPick}
      />
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
      <div className="mt-1 grid grid-cols-3 gap-1.5 sm:max-w-md">
        {filters.map(({ kind, label, options }) => (
          <select
            key={kind}
            aria-label={label}
            value={
              "filter" in browsing && browsing.filter.kind === kind
                ? browsing.filter.value
                : ""
            }
            onChange={(event) => {
              setQuery("");
              if (event.target.value)
                browse({ filter: { kind, value: event.target.value } });
              else browse({ shelf: "latest" });
            }}
            className="h-9 min-w-0 rounded-sm border border-[#303030] bg-[#101010] px-1.5 text-xs text-[#dedede] focus:border-blue-500"
          >
            <option value="">{label}</option>
            {options.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        ))}
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
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(136px,1fr))]">
          {movies.map((card) => (
            <button
              key={card.slug}
              aria-label={`Xem phim ${card.name}`}
              disabled={busy}
              className="group min-w-0 self-start text-left disabled:opacity-60"
              onClick={() => onPick(card)}
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
