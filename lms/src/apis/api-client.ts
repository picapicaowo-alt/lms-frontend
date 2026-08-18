import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {ApiError, ApiResponse} from './types';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  /**
   * Path that exchanges the refresh cookie for a new access token. Set it to
   * enable transparent recovery from an expired token; leave it off and a 401
   * is simply reported to the caller.
   */
  refreshPath?: string;
  /** Called when the session cannot be recovered and the user must log in. */
  onSessionExpired?: () => void;
}

export interface RequestConfig extends Omit<AxiosRequestConfig, 'url' | 'method'> {
  skipAuth?: boolean;
  retryCount?: number;
  /** Set internally once a request has been retried after a refresh. */
  isRetryAfterRefresh?: boolean;
}

export class ApiClient {
  private readonly client: AxiosInstance;
  private config: ApiClientConfig;
  private accessToken?: string;
  
  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      ...config
    };
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      },
      withCredentials: this.config.withCredentials || false
    });
    
    this.client.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );
    
    this.client.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }
  
  public getClient(): AxiosInstance {
    return this.client;
  }
  
  public setAccessToken(token: string): void {
    this.accessToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
  }
  
  public clearAccessToken(): void {
    this.accessToken = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }
  
  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    config.headers = config.headers || {};

    // No X-Request-Timestamp header. It appears in no API contract, nothing
    // reads it, and being a custom header it forces a CORS preflight that the
    // server rejects: its Access-Control-Allow-Headers lists the name as
    // "field-x-request-timestamp", so every cross-origin call fails outright.

    const requestConfig = config as unknown as RequestConfig;
    if (requestConfig.skipAuth !== undefined && requestConfig.skipAuth) {
      delete config.headers.Authorization;
    } else {
      if (this.accessToken === undefined) {
        const token = localStorage.getItem('accToken');
        if (token !== null) {
          this.accessToken = token;
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
      } else {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
    }
    
    // Method and path only, and only in development. This used to log the
    // whole request: `headers` carries the bearer token and `data` carries the
    // login body, so every sign-in wrote the user's password to the console —
    // and unlike the response logger below it had no environment guard, so it
    // shipped in the production bundle.
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  }
  
  private handleRequestError(error: any): Promise<never> {
    return Promise.reject(error);
  }
  
  private handleResponse(response: AxiosResponse): AxiosResponse {
    // Status only. The body was being logged too, and a login response body
    // contains the access token. `import.meta.env.DEV` rather than
    // process.env.NODE_ENV, which Vite does not reliably define in client code
    // — so this guard may never have held in the first place.
    if (import.meta.env.DEV) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} ${response.status}`
      );
    }
    
    return response;
  }
  
  private handleResponseError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      code: error.response?.status || 0,
      message: error.message,
      details: error.response?.data as any
    };
    
    if (error.response?.status === 401) {
      return this.handleAuthError(error);
    }
    
    console.error('[API Error]', apiError);
    return Promise.reject(apiError);
  }
  
  /**
   * Recovers from an expired access token, once, then replays the request.
   *
   * The access token is short-lived while the refresh cookie lasts about two
   * weeks, so a 401 mid-session is the normal course of events rather than a
   * real authentication failure. Without this every request starts failing the
   * moment the token ages out and the user is thrown back to the login screen
   * mid-task.
   */
  private async handleAuthError(error: AxiosError): Promise<never> {
    const original = error.config as (InternalAxiosRequestConfig & RequestConfig) | undefined;

    const canRetry = this.config.refreshPath
      && original
      && !original.isRetryAfterRefresh
      // Refreshing because the refresh call itself was rejected would loop.
      && original.url !== this.config.refreshPath;

    if (canRetry) {
      try {
        await this.refreshAccessToken();
        original.isRetryAfterRefresh = true;
        original.headers.Authorization = `Bearer ${this.accessToken}`;
        return await this.client.request(original) as never;
      } catch {
        this.endSession();
      }
    }

    return Promise.reject({
      code: 401,
      message: 'Authentication required',
      details: error.response?.data
    });
  }

  /**
   * Fetches a new access token, coalescing concurrent callers.
   *
   * A dashboard fires several requests at once, so an expired token produces a
   * burst of 401s. They share one refresh: without this they would each rotate
   * the refresh cookie, and every rotation but the last would be invalidated.
   */
  private refreshInFlight?: Promise<void>;

  private refreshAccessToken(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      // A bare axios call: the instance interceptor would recurse on failure.
      const response = await axios.post<ApiResponse<string>>(
        `${this.config.baseURL}${this.config.refreshPath}`,
        undefined,
        {withCredentials: true, timeout: this.config.timeout}
      );

      // `data` here is the token itself, not an object wrapping one.
      const token = response.data?.data;
      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Refresh response carried no access token');
      }

      this.setAccessToken(token);
      localStorage.setItem('accToken', token);
    })();

    return this.refreshInFlight.finally(() => {
      this.refreshInFlight = undefined;
    });
  }

  private endSession(): void {
    this.clearAccessToken();
    localStorage.removeItem('accToken');
    this.config.onSessionExpired?.();
  }
  
  private mergeRequestConfig(config?: RequestConfig): AxiosRequestConfig {
    if (!config) return {};
    
    if (config.headers) {
      return {
        ...config,
        headers: {
          ...config.headers
        }
      };
    }
    
    return config;
  }
  
  public async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeRequestConfig(config);
    const response = await this.client.get<ApiResponse<T>>(url, mergedConfig);
    return response.data;
  }
  
  public async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeRequestConfig(config);
    const response = await this.client.post<ApiResponse<T>>(url, data, mergedConfig);
    return response.data;
  }
  
  public async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeRequestConfig(config);
    const response = await this.client.put<ApiResponse<T>>(url, data, mergedConfig);
    return response.data;
  }
  
  public async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeRequestConfig(config);
    const response = await this.client.patch<ApiResponse<T>>(url, data, mergedConfig);
    return response.data;
  }
  
  public async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const mergedConfig = this.mergeRequestConfig(config);
    const response = await this.client.delete<ApiResponse<T>>(url, mergedConfig);
    return response.data;
  }
  
  public async uploadFile<T = any>(
    url: string,
    file: File,
    fieldName = 'file',
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }
    
    const config: RequestConfig = {
      headers: {}
    };
    
    return this.post<T>(url, formData, config);
  }
  
  public createCancelToken() {
    return axios.CancelToken.source();
  }
}