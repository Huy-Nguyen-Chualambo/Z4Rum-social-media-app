"use client";
import { Bookmark } from "lucide-react";
import { toggleSaved, useLibrary } from "@/lib/theater/library";
import type { MovieCard } from "@/lib/theater/movies";
import { quiet } from "./MovieBrowser";

export default function SaveButton({ film }: { film: MovieCard }) {
  const { saved } = useLibrary();
  const on = saved.some(
    (item) => item.source === film.source && item.slug === film.slug,
  );
  return (
    <button
      className={quiet}
      aria-pressed={on}
      onClick={() => toggleSaved(film)}
    >
      <Bookmark size={16} fill={on ? "currentColor" : "none"} />
      {on ? "Đã lưu" : "Lưu phim"}
    </button>
  );
}
