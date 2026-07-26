import { API_BASE_URL } from './config';
import { getLocalStorage } from '../utils';
import { message } from 'antd';
import { debugCurrentToken } from '../auth-debug';

interface RequestOptions extends RequestInit {
    params?: Record<string, any>;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<any> {
        const { params, ...init } = options;

        let url = `${this.baseUrl}${endpoint}`;

        // Add query parameters if present
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        // Get token safely
        const storage = getLocalStorage();
        const token = storage?.getItem('auth_token');

        // Prepare headers
        const headers: any = {
            ...init.headers,
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            
            // Debug token in development before sending request
            if (process.env.NODE_ENV === 'development') {
                console.log(`%c[API] Request to ${endpoint}`, 'color: blue; font-weight: bold');
                debugCurrentToken();
            }
        }

        // Add language header (CRMEB-style)
        if (typeof window !== 'undefined') {
            const lang = localStorage.getItem('lang') || 'zh';
            headers['cb-lang'] = lang;
            headers['Accept-Language'] = lang;
        }

        // Set Content-Type to application/json by default, unless body is FormData
        // If body is FormData, let the browser set the Content-Type with boundary
        if (!(init.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                ...init,
                headers,
                credentials: 'include',
                mode: 'cors',
            });

            // Try to parse JSON, but handle cases where response might be empty or not JSON
            let data: any = {};
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (e) {
                    console.warn('Failed to parse JSON response', e);
                }
            } else if (response.status !== 204) {
                // For non-JSON responses (like blob export), we might need special handling
                // But for now, let's assume most APIs return JSON or we handle blob separately in specific methods if needed.
                // Actually, exportTranslations expects a Blob.
                // The service method passes `responseType: 'blob'` in axios.
                // Here `options` might contain something indicating blob?
                // Fetch doesn't support `responseType` in init options like axios.
                // We need to check if the caller expects a blob.
                // But `exportTranslations` in `translation.ts` calls `apiClient.get(..., { responseType: 'blob' })`.
                // So I should handle `responseType` in `options`.
            }

            if ((options as any).responseType === 'blob') {
                const blob = await response.blob();
                return { data: blob, status: response.status };
            }

            // Handle 401 Unauthorized - Token expired or invalid
            if (response.status === 401) {
                const errorMessage = data.message || '登录已过期，请重新登录';
                message.error(errorMessage);
                
                // Clear token and redirect to login
                const storage = getLocalStorage();
                storage?.removeItem('auth_token');
                storage?.removeItem('user_info');
                
                // Redirect to login page after a short delay
                if (typeof window !== 'undefined') {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                }
                
                throw new Error(errorMessage);
            }

            if (!response.ok) {
                const errorMessage = data.message || `Request failed with status ${response.status}`;
                if (data.code === 400) {
                    message.error(errorMessage);
                }
                throw new Error(errorMessage);
            }

            return { data, status: response.status };

        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    get<T>(url: string, options?: RequestOptions & { responseType?: string }) {
        return this.request<T>(url, { ...options, method: 'GET' });
    }

    post<T>(url: string, data?: any, options?: RequestOptions) {
        const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
        return this.request<T>(url, {
            ...options,
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data)
        });
    }

    put<T>(url: string, data?: any, options?: RequestOptions) {
        const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
        return this.request<T>(url, {
            ...options,
            method: 'PUT',
            body: isFormData ? data : JSON.stringify(data)
        });
    }

    delete<T>(url: string, options?: RequestOptions) {
        return this.request<T>(url, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient(API_BASE_URL);