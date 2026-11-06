import { create } from "zustand";
import { authApi } from "../api/authApi";

type User = { id: string; username: string; email: string; avatarUrl?: string; bio?: string; gender?: "male" | "female" } | null;

type AuthState = {
  user: User;
  token: string | null;
  /** `remember` keeps the login after the browser closes; otherwise it ends with the tab. */
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  googleLogin: (credential: string, gender?: "male" | "female", remember?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, gender: "male" | "female") => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
};

const TOKEN_KEY = "z4rum_token";
function keepToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  (remember ? sessionStorage : localStorage).removeItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? (sessionStorage.getItem("z4rum_token") || localStorage.getItem("z4rum_token")) : null,
  async login(email, password, remember = true) {
    const { token, user } = await authApi.login({ email, password });
    keepToken(token, remember);
    set({ token, user });
  },
  async googleLogin(credential, gender, remember = true) {
    const { token, user } = await authApi.googleLogin({ credential, gender });
    keepToken(token, remember);
    set({ token, user });
  },
  async register(username, email, password, gender) {
    const { token, user } = await authApi.register({ username, email, password, gender });
    keepToken(token, true);
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
