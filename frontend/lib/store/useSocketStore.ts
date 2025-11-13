import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/utils/url";

interface SocketState {
  socket: Socket | null;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connect: (token: string) => {
    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"], // fallback an toàn
      withCredentials: false,
    });
    set({ socket });
  },
  disconnect: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null });
    }
  },
}));
