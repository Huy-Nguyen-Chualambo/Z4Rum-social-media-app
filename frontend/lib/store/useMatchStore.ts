import { create } from "zustand";

export type Peer = { id: string; username?: string; avatarUrl?: string | null } | null;

export type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
};

type MatchState = {
  finding: boolean;
  sessionId: string | null;
  peer: Peer;
  messages: Message[];
  matchMode: "normal" | "opposite";
  startFinding: (mode: "normal" | "opposite") => void;
  setFound: (sessionId: string, peer: Peer) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  endSession: () => void;
};

export const useMatchStore = create<MatchState>((set) => ({
  finding: false,
  sessionId: null,
  peer: null,
  messages: [],
  matchMode: "normal",
  startFinding: (mode) => set({ finding: true, sessionId: null, peer: null, messages: [], matchMode: mode }),
  setFound: (sessionId, peer) => set({ finding: false, sessionId, peer, messages: [] }),
  addMessage: (message) => set((state) => {
    // Check if message already exists to avoid duplicates
    const exists = state.messages.some((m) => m.id === message.id);
    if (exists) return state;
    return { messages: [...state.messages, message] };
  }),
  setMessages: (messages) => set({ messages }),
  endSession: () => set({ finding: false, sessionId: null, peer: null, messages: [] }),
}));
