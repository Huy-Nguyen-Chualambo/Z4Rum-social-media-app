import { create } from "zustand";

type Peer = { id: string; avatarUrl?: string; bio?: string } | null;

type MatchState = {
  finding: boolean;
  sessionId: string | null;
  peer: Peer;
  startFinding: () => void;
  setFound: (sessionId: string, peer: Peer) => void;
  endSession: () => void;
};

export const useMatchStore = create<MatchState>((set) => ({
  finding: false,
  sessionId: null,
  peer: null,
  startFinding: () => set({ finding: true, sessionId: null, peer: null }),
  setFound: (sessionId, peer) => set({ finding: false, sessionId, peer }),
  endSession: () => set({ finding: false, sessionId: null, peer: null }),
}));
