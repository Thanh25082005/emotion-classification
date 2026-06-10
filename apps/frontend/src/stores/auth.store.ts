import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { tokenStorage } from "@/lib/token";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      setLoading: (loading: boolean) =>
        set({
          isLoading: loading,
        }),

      logout: () => {
        tokenStorage.clear();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
