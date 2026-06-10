import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/lib/token";
import type { ApiError } from "@/types/api.types";
import type { TokenResponse } from "@/types/auth.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  failedQueue = [];
};

// Request interceptor: inject Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor: handle 401 with token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token: string) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>)[
                "Authorization"
              ] = `Bearer ${token}`;
            } else {
              originalRequest.headers = { Authorization: `Bearer ${token}` };
            }
            return apiClient(originalRequest);
          })
          .catch((err: unknown) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/refresh-token`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token } = response.data;
        tokenStorage.setAccessToken(access_token);
        tokenStorage.setRefreshToken(refresh_token);

        processQueue(null, access_token);
        isRefreshing = false;

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>)[
            "Authorization"
          ] = `Bearer ${access_token}`;
        } else {
          originalRequest.headers = {
            Authorization: `Bearer ${access_token}`,
          };
        }

        return apiClient(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);
        isRefreshing = false;
        tokenStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error?.code && data?.error?.message) {
      return data.error as ApiError;
    }
    if (data?.message) {
      return {
        code: String(error.response?.status ?? "UNKNOWN"),
        message: data.message as string,
      };
    }
    return {
      code: String(error.response?.status ?? "NETWORK_ERROR"),
      message: error.message || "An unexpected error occurred",
    };
  }
  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
    };
  }
  return {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
  };
}

export default apiClient;
