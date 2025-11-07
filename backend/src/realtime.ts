import type { Server } from "socket.io";

let ioRef: Server | null = null;

export function setIO(io: Server) {
  ioRef = io;
}

export function emitLikeUpdated(payload: { postId: string; likes: number }) {
  ioRef?.emit("post:likeUpdated", payload);
}


