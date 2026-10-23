import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v2';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add JWT token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = await SecureStore.getItemAsync('jwt_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const token = await this.refreshAccessToken();
          if (token) {
            // Retry the original request after the refreshed token is stored.
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    // Access tokens live for 15 minutes. Multiple in-flight requests can all
    // receive a 401 at once, so share one rotation attempt instead of racing
    // the single-use refresh token.
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) return null;

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token, refreshToken: rotatedRefreshToken } = response.data;
        if (!token) throw new Error('Refresh response did not include an access token');

        await SecureStore.setItemAsync('jwt_token', token);
        if (rotatedRefreshToken) {
          await SecureStore.setItemAsync('refresh_token', rotatedRefreshToken);
        }
        return token;
      } catch {
        // A rejected rotation means the session family is no longer usable.
        await SecureStore.deleteItemAsync('jwt_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return null;
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  public get(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.get(url, config);
  }

  public post(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  public put(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  public patch(url: string, data?: any, config?: InternalAxiosRequestConfig) {
    return this.client.patch(url, data, config);
  }

  public delete(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}

export const api = new ApiClient();
export default api;
