import apiClient from "./api-client";
import { tokenStorage } from "@/lib/token";
import type { User, LoginRequest, RegisterRequest, TokenResponse } from "@/types/auth.types";

export const authService = {
  async register(data: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>("/auth/register", data);
    return response.data;
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>("/auth/login", data);
    const tokenResponse = response.data;
    tokenStorage.setAccessToken(tokenResponse.access_token);
    tokenStorage.setRefreshToken(tokenResponse.refresh_token);
    return tokenResponse;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      tokenStorage.clear();
    }
  },

  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = tokenStorage.getRefreshToken();
    const response = await apiClient.post<TokenResponse>("/auth/refresh-token", {
      refresh_token: refreshToken,
    });
    const tokenResponse = response.data;
    tokenStorage.setAccessToken(tokenResponse.access_token);
    tokenStorage.setRefreshToken(tokenResponse.refresh_token);
    return tokenResponse;
  },
};
