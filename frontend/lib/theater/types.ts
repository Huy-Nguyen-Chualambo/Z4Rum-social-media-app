import type { MovieSource } from "./movies";

export type Playback = {
  source: MovieSource;
  slug: string;
  server: number;
  episode: string;
  hostId: string;
  hostName: string;
  hostAway: boolean;
  playing: boolean;
  position: number;
  receivedAt: number;
};
export type RoomMember = { userId: string; username: string };
export type RoomMessage = {
  id: string;
  from: string;
  username: string;
  text: string;
  at: number;
};
export type FilmChoice = {
  source: MovieSource;
  slug: string;
  server: number;
  episode: string;
};
/** One screen of film: a shared room, or a guest watching alone. */
export type Screening = {
  self: string;
  guest: boolean;
  solo: boolean;
  members: RoomMember[];
  playback: Playback | null;
  messages: RoomMessage[];
  missing: boolean;
  problem: string;
  isHost: boolean;
  sync: (playing: boolean, position: number) => void;
  changeFilm: (film: FilmChoice, playing: boolean, position: number) => void;
  sendChat: (text: string) => boolean;
};
