import { apiClient } from './client';
import { getLocalStorage } from '../utils';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  code: number;
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      username: string;
      nickname: string;
      avatar?: string;
    };
    admin?: {
      id: number;
      username: string;
      real_name: string;
      role: string;
      permissions: string[];
    };
  };
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class AuthService {

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post('/admin/login', credentials);
    const data = response.data;

    console.log('Login response data:', data);

    if (data.code !== 200) {
      throw new Error(data.message || '登录失败');
    }

    // Normalize data: if 'admin' exists but 'user' does not, map admin to user
    if (data.data && data.data.admin && !data.data.user) {
      data.data.user = data.data.admin;
    }

    return data;
  }

  async logout(): Promise<void> {
    const storage = getLocalStorage();

    try {
      await apiClient.post('/admin/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Always remove token from localStorage
    storage?.removeItem('auth_token');
    storage?.removeItem('user_info');
  }

  async getCurrentUser(): Promise<any> {
    const storage = getLocalStorage();
    const token = storage?.getItem('auth_token');
    if (!token) {
      return null;
    }

    const response = await apiClient.get('/admin/info');
    const data = response.data;

    if (data.code !== 200) {
      throw new Error(data.message || '获取用户信息失败');
    }

    return data.data;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.get('/admin/info');
      const data = response.data;
      return data.code === 200;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();