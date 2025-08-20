import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useUIStore } from '@/store';

// API response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

// API client configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

class ApiClient {
  private client: AxiosInstance;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add loading state
        useUIStore.getState().setGlobalLoading(true);
        
        // Add timestamp for caching
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
        
        return config;
      },
      (error) => {
        useUIStore.getState().setGlobalLoading(false);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        useUIStore.getState().setGlobalLoading(false);
        return response;
      },
      async (error) => {
        useUIStore.getState().setGlobalLoading(false);
        
        // Handle retry logic
        if (error.config && !error.config._retry && this.shouldRetry(error)) {
          error.config._retry = true;
          return this.retryRequest(error.config);
        }
        
        // Handle specific error cases
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    const status = error.response?.status;
    const method = error.config?.method?.toLowerCase();
    
    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      (status >= 500 && status < 600) ||
      (status === 429 && method !== 'post' && method !== 'put' && method !== 'delete')
    );
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    for (let i = 0; i < this.retryCount; i++) {
      try {
        await this.delay(this.retryDelay * Math.pow(2, i));
        return await this.client.request(config);
      } catch (error) {
        if (i === this.retryCount - 1) {
          throw error;
        }
      }
    }
    throw new Error('Max retry attempts reached');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleError(error: any) {
    const message = this.getErrorMessage(error);
    const type = this.getErrorType(error);
    
    useUIStore.getState().addToast({
      message,
      type,
      duration: 5000,
    });
  }

  private getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  private getErrorType(error: any): 'error' | 'warning' | 'info' {
    const status = error.response?.status;
    
    if (status >= 500) {
      return 'error';
    }
    
    if (status >= 400) {
      return 'warning';
    }
    
    return 'info';
  }

  // Generic request methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export convenience methods
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
};
