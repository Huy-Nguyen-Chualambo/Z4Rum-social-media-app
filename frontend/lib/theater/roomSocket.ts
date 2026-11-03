import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/utils/url";
import type { FilmChoice } from "./types";

const CREATE_TIMEOUT_MS = 8_000;

/** Without a token this connects as a guest, who can watch a room but not act in it. */
export const theaterSocket = (token: string | null) =>
  io(`${SOCKET_BASE_URL}/theater`, {
    auth: token ? { token } : {},
    // Keep polling available when the WebSocket upgrade is blocked.
    transports: ["polling", "websocket"],
    tryAllTransports: true,
    withCredentials: false,
  });

/** Opens a room and returns its id. The room itself is entered from its own page. */
export function createRoom(token: string, film: FilmChoice, position = 0) {
  return new Promise<string>((resolve, reject) => {
    const socket = theaterSocket(token);
    socket.timeout(CREATE_TIMEOUT_MS).emit(
      "theater:create",
      { ...film, position },
      (_failed: Error | null, reply?: { roomId?: string; error?: string }) => {
        socket.disconnect();
        if (reply?.roomId) resolve(reply.roomId);
        else reject(new Error(reply?.error ?? "Không tạo được phòng. Hãy thử lại."));
      },
    );
  });
}
