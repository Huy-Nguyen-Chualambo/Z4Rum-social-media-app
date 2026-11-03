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
