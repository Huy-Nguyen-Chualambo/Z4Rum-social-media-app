import { create } from "zustand";
import { authApi } from "../api/authApi";

type User = { id: string; username: string; email: string; avatarUrl?: string; bio?: string; gender?: "male" | "female" } | null;

type AuthState = {
  user: User;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, gender: "male" | "female") => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? (sessionStorage.getItem("z4rum_token") || localStorage.getItem("z4rum_token")) : null,
  async login(email, password) {
    const { token, user } = await authApi.login({ email, password });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("z4rum_token", token);
      localStorage.removeItem("z4rum_token");
    }
    set({ token, user });
  },
  async register(username, email, password, gender) {
    const { token, user } = await authApi.register({ username, email, password, gender });
    if (typeof window !== "undefined") {
      sessionStorage.setItem("z4rum_token", token);
      localStorage.removeItem("z4rum_token");
    }
    set({ token, user });
  },
  async loadMe() {
    try {
      const me = await authApi.me();
      set({ user: me });
    } catch {
      set({ user: null, token: null });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("z4rum_token");
        localStorage.removeItem("z4rum_token");
      }
    }
  },
  logout() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("z4rum_token");
      localStorage.removeItem("z4rum_token");
    }
    set({ user: null, token: null });
  },
}));
