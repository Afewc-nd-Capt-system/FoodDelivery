import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v2';

class ApiClient {
  private client: AxiosInstance;

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

          try {
            // Attempt to refresh token
            const refreshToken = await SecureStore.getItemAsync('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                refreshToken,
              });

              const { token } = response.data;
              await SecureStore.setItemAsync('jwt_token', token);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            await SecureStore.deleteItemAsync('jwt_token');
            await SecureStore.deleteItemAsync('refresh_token');
            // In a real app, navigate to login screen
          }
        }

        return Promise.reject(error);
      }
    );
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
