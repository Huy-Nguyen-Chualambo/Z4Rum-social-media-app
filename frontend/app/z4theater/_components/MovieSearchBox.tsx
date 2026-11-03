"use client";
import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { rankMovies } from "@/lib/theater/movieSearch";
import {
  searchMovies,
  type MovieCard,
  type MovieSource,
} from "@/lib/theater/movies";

const MIN_LETTERS = 2;
const MAX_SUGGESTIONS = 6;
// The backup looks up every film it lists, so it waits for a longer pause in typing.
const PAUSE_MS: Record<MovieSource, number> = { phimapi: 250, nguonc: 700 };

type Found = { key: string; movies: MovieCard[]; failed: boolean };

/** The search field, suggesting films as the viewer types. */
export default function MovieSearchBox({
  source,
  query,
  busy,
  onQuery,
  onSearch,
  onPick,
}: {
  source: MovieSource;
  query: string;
  busy: boolean;
  onQuery: (query: string) => void;
  onSearch: (keyword: string) => void;
  onPick: (card: MovieCard) => void;
}) {
  const list = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [found, setFound] = useState<Found | null>(null);
  const keyword = query.trim();
  const long = keyword.length >= MIN_LETTERS;
  const key = `${source}:${keyword}`;

  useEffect(() => {
    if (!open || !long) return;
    let live = true;
    const timer = setTimeout(() => {
      searchMovies(source, keyword, 1)
        .then((result) => {
          if (live)
            setFound({
              key,
              movies: rankMovies(result.movies, keyword).slice(0, MAX_SUGGESTIONS),
              failed: false,
            });
        })
        // Only a suggestion: pressing search still reports what went wrong.
        .catch(() => {
          if (live) setFound({ key, movies: [], failed: true });
        });
    }, PAUSE_MS[source]);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, long, source, keyword, key]);

  // The last answer stays up while the next one loads, so the list does not flicker.
  const sameSource = found?.key.startsWith(`${source}:`);
  const movies = long && sameSource ? (found?.movies ?? []) : [];
  const settled = found?.key === key;
  const message = movies.length
    ? ""
    : !settled
      ? "Đang tìm…"
      : found?.failed
        ? ""
        : "Không có gợi ý nào.";
  const showing = open && long && Boolean(movies.length || message);
  const choose = (card: MovieCard) => {
    setOpen(false);
    setActive(-1);
    onPick(card);
  };

  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
        if (keyword) onSearch(keyword);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <input
          role="combobox"
          aria-label="Tìm phim"
          aria-autocomplete="list"
          aria-expanded={showing}
          aria-controls={list}
          aria-activedescendant={
            showing && active >= 0 ? `${list}-${active}` : undefined
          }
          autoComplete="off"
          value={query}
          maxLength={100}
          onChange={(event) => {
            onQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            } else if (showing && movies.length && event.key === "ArrowDown") {
              event.preventDefault();
              setActive((active + 1) % movies.length);
            } else if (showing && movies.length && event.key === "ArrowUp") {
              event.preventDefault();
              setActive(active <= 0 ? movies.length - 1 : active - 1);
            } else if (
              event.key === "Enter" &&
              !event.nativeEvent.isComposing &&
              showing &&
              movies[active] &&
              !busy
            ) {
              event.preventDefault();
              choose(movies[active]);
            }
          }}
          placeholder="Tên phim hoặc tên gốc…"
          className="h-10 w-full rounded-sm border border-[#303030] bg-[#101010] px-3 text-base placeholder:text-[#858585] focus:border-blue-500 md:text-sm"
        />
        {showing && (
          <div
            id={list}
            role="listbox"
            aria-label="Gợi ý phim"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-sm border border-[#303030] bg-[#181818] shadow-lg"
          >
            {message && (
              <p className="px-3 py-2.5 text-sm text-[#969696]">{message}</p>
            )}
            {movies.map((card, index) => (
              <div
                key={`${card.source}:${card.slug}`}
                id={`${list}-${index}`}
                role="option"
                aria-selected={index === active}
                // Keeps the field focused, so the list is still there when the tap lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (!busy) choose(card);
                }}
                className={`flex min-h-12 cursor-pointer items-center gap-2.5 px-2 py-1.5 ${index === active ? "bg-[#292929]" : "hover:bg-[#292929]"}`}
              >
                <span className="block h-11 w-8 shrink-0 overflow-hidden rounded-sm bg-[#1c1c1c]">
                  {card.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.poster}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#dedede]">
                    {card.name}
                  </span>
                  <span className="block truncate text-xs text-[#858585]">
                    {[card.originalName, card.year, card.status]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        aria-label="Tìm"
        className="flex h-10 w-11 shrink-0 items-center justify-center rounded-sm bg-blue-500 text-white"
      >
        <Search size={18} />
      </button>
    </form>
  );
}
