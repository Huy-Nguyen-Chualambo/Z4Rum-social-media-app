import { create } from "zustand";

/**
 * Cross-page Z4chat state: the unread badge the nav shows everywhere, and the
 * per-session draft.
 *
 * Drafts live here rather than in the chat page's own state on purpose - "lỗi
 * char nhiều mà ko fix" in the survey includes losing what you were typing when
 * a reply fails and you navigate away. Messages themselves stay local to the
 * chat page, so two sessions can never leak into each other.
 */

const DRAFT_STORAGE_KEY = "z4chat_drafts";

const readDrafts = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeDrafts = (drafts: Record<string, string>): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full or blocked - the in-memory copy still works for this visit.
  }
};

type Z4chatState = {
  unreadTotal: number;
  /** Session ids with a pending proactive message, for the hub's "tin mới" dot. */
  unreadSessions: string[];
  drafts: Record<string, string>;
  hydrated: boolean;

  setUnread: (total: number, sessions?: string[]) => void;
  clearUnreadFor: (sessionId: string, amount: number) => void;
  noteProactive: (sessionId: string) => void;

  hydrateDrafts: () => void;
  draftFor: (sessionId: string) => string;
  setDraft: (sessionId: string, value: string) => void;
  clearDraft: (sessionId: string) => void;
};

export const useZ4chatStore = create<Z4chatState>((set, get) => ({
  unreadTotal: 0,
  unreadSessions: [],
  drafts: {},
  hydrated: false,

  setUnread: (total, sessions) =>
    set((state) => ({
      unreadTotal: Math.max(0, total),
      unreadSessions: sessions ?? state.unreadSessions,
    })),

  clearUnreadFor: (sessionId, amount) =>
    set((state) => ({
      unreadTotal: Math.max(0, state.unreadTotal - Math.max(0, amount)),
      unreadSessions: state.unreadSessions.filter((id) => id !== sessionId),
    })),

  noteProactive: (sessionId) =>
    set((state) => ({
      unreadTotal: state.unreadTotal + 1,
      unreadSessions: state.unreadSessions.includes(sessionId)
        ? state.unreadSessions
        : [...state.unreadSessions, sessionId],
    })),

  // Deferred to an effect so the server render and the first client render agree.
  hydrateDrafts: () => {
    if (get().hydrated) return;
    set({ drafts: readDrafts(), hydrated: true });
  },

  draftFor: (sessionId) => get().drafts[sessionId] || "",

  setDraft: (sessionId, value) =>
    set((state) => {
      const drafts = { ...state.drafts, [sessionId]: value };
      writeDrafts(drafts);
      return { drafts };
    }),

  clearDraft: (sessionId) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[sessionId];
      writeDrafts(drafts);
      return { drafts };
    }),
}));
