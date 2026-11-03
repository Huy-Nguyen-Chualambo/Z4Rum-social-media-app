"use client";
import { useState } from "react";
import {
  findOnSource,
  getMovie,
  otherSource,
  type Movie,
  type MovieCard,
} from "@/lib/theater/movies";

/** Opens a film from the catalog, trying the other source if this one fails. */
export function usePickMovie() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const pick = async (card: MovieCard) => {
    setOpening(true);
    setNotice("");
    try {
      const film = await getMovie(card.source, card.slug).catch(() =>
        findOnSource(card, otherSource(card.source)),
      );
      if (film && !film.adult) setMovie(film);
      else setNotice("Không mở được phim này. Hãy chọn phim khác.");
    } catch {
      setNotice("Không mở được phim này. Hãy chọn phim khác.");
    } finally {
      setOpening(false);
    }
  };
  return { movie, opening, notice, pick, clear: () => setMovie(null) };
}
