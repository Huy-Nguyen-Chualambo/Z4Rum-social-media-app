import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/utils/url";
import type { FilmChoice } from "./types";

// The backend sleeps when idle and takes about a minute to wake, which is not a failure.
const CREATE_TIMEOUT_MS = 75_000;
const WAKING_AFTER_MS = 4_000;

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
export function createRoom(
  token: string,
  film: FilmChoice,
  position = 0,
  onWaking?: () => void,
) {
  return new Promise<string>((resolve, reject) => {
    const socket = theaterSocket(token);
    const waking = setTimeout(() => onWaking?.(), WAKING_AFTER_MS);
    socket.timeout(CREATE_TIMEOUT_MS).emit(
      "theater:create",
      { ...film, position },
      (_failed: Error | null, reply?: { roomId?: string; error?: string }) => {
        clearTimeout(waking);
        socket.disconnect();
        if (reply?.roomId) resolve(reply.roomId);
        else reject(new Error(reply?.error ?? "Không tạo được phòng. Hãy thử lại."));
      },
    );
  });
}
