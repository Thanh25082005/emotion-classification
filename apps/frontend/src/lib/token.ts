const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const isClient = (): boolean => typeof window !== "undefined";

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    if (!isClient()) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (!isClient()) return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clear(): void {
    if (!isClient()) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
