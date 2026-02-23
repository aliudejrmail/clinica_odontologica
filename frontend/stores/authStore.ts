import { create } from "zustand";
import type { User } from "@/types/api";
import { getStoredUser, getStoredToken, setAuth as persistAuth, clearAuth as persistClear } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  setAuth: (token, user) => {
    persistAuth(token, user);
    set({ token, user });
  },
  logout: () => {
    persistClear();
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    set({ token, user, hydrated: true });
  },
}));
