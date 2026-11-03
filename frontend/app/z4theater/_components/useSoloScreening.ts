"use client";

import { useState } from "react";
import type { FilmChoice, Playback, Screening } from "@/lib/theater/types";
import { watchPath } from "@/lib/theater/watchLink";

const SOLO = "solo";

/** A guest watching alone, shaped like a room they host so the screen is the same. */
export function useSoloScreening(start: FilmChoice, startAt: number): Screening {
  const [playback, setPlayback] = useState<Playback>(() => ({
    ...start,
    hostId: SOLO,
    hostName: "",
    hostAway: false,
    playing: false,
    position: startAt,
    receivedAt: Date.now(),
  }));
  return {
    self: SOLO,
    guest: true,
    solo: true,
    members: [],
    playback,
    messages: [],
    missing: false,
    problem: "",
    isHost: true,
    sync: () => {},
    changeFilm: (film) => {
      setPlayback({ ...playback, ...film, position: 0, receivedAt: Date.now() });
      window.history.replaceState(null, "", watchPath(film));
    },
    sendChat: () => false,
  };
}
