import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { supabase } from "@/lib/supabase";

let httpClient: AxiosInstance | null = null;

const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.warn("Failed to get auth session for request:", error);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor to handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (!refreshError && session?.access_token) {
            originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
          // Optionally redirect to login or emit auth error event
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
};

export const getHttpClient = (): AxiosInstance => {
  if (!httpClient) {
    httpClient = createHttpClient();
  }
  return httpClient;
};

export const resetHttpClient = (): void => {
  httpClient = null;
};
